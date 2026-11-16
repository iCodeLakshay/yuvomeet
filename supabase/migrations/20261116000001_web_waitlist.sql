-- Web waitlist for the landing page (apps/landing). Visitors without an account leave an email and a
-- city; the join-waitlist Edge Function writes here with the service role. Nothing in this file is
-- reachable by anon or authenticated: the tables live in `private` and the one RPC is service-role only.
--
-- Rate limiting is per connection, not per user (there is no user yet), so it has its own table keyed
-- by an HMAC of the client IP. The raw IP is never stored.

create table private.web_waitlist (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) between 6 and 254 and email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  city text not null check (char_length(city) between 2 and 60),
  -- The exact wording the visitor ticked, so consent can be shown later (docs/privacy-and-compliance.md).
  consent_text text not null check (char_length(consent_text) between 10 and 300),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (email, city)
);

create table private.web_rate (
  key text not null check (char_length(key) = 64),
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, endpoint, window_start)
);
create index web_rate_window_idx on private.web_rate (window_start);

alter table private.web_waitlist enable row level security;
alter table private.web_rate enable row level security;
revoke all on private.web_waitlist, private.web_rate from public, anon, authenticated;

-- Returns false when the connection is over its limit; true otherwise, including for an address that
-- is already on the list for that city (the caller answers the same way, so the form never reveals
-- whether an email is already signed up).
create function public.svc_web_waitlist_join(
  p_rate_key text,
  p_email text,
  p_city text,
  p_consent_text text,
  p_window_seconds int default 600,
  p_limit int default 5
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  -- Old windows are dropped as new ones open, so the table stays small without a cron job.
  delete from private.web_rate where window_start < now() - interval '1 day';

  insert into private.web_rate as wr (key, endpoint, window_start, count)
  values (p_rate_key, 'join-waitlist', v_window, 1)
  on conflict (key, endpoint, window_start) do update set count = wr.count + 1
  returning count into v_count;
  if v_count > p_limit then
    return false;
  end if;

  insert into private.web_waitlist (email, city, consent_text)
  values (lower(trim(p_email)), trim(p_city), p_consent_text)
  on conflict (email, city) do nothing;
  return true;
end;
$$;

revoke execute on function public.svc_web_waitlist_join(text, text, text, text, int, int) from public, anon, authenticated;
grant execute on function public.svc_web_waitlist_join(text, text, text, text, int, int) to service_role;

-- Admins see web signup counts per city (never the emails) next to in-app ones on the cities page.
-- Same pattern as admin_city_waitlist: a security-barrier view gated by the admin role and an aal2
-- session (app.is_full_admin, 20261026000002_helpers.sql), since the cities page is admin-only.
create view public.admin_web_waitlist
with (security_barrier = true)
as
  select w.city, count(*)::int as signups, max(w.created_at) as latest
  from private.web_waitlist w
  where app.is_full_admin()
  group by w.city;

revoke all on public.admin_web_waitlist from public, anon;
grant select on public.admin_web_waitlist to authenticated;
