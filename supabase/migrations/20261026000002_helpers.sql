-- Helper functions. Visibility logic lives only here (docs/data-model.md).
--
-- Schema layout:
--   app      policy helpers. Usable by authenticated, NOT exposed through PostgREST,
--            so they cannot be called as RPCs to probe other users (S-15, S-17).
--   private  internal helpers and server-only tables.
-- All security definer functions set search_path = '' (S-4).

create schema if not exists app;
revoke all on schema app from public, anon;
grant usage on schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Settings and time
-- -----------------------------------------------------------------------------
create function private.setting(p_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.val from private.settings s where s.key = p_key;
$$;

create function private.setting_int(p_key text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select private.setting(p_key)::int;
$$;

create function private.ist_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

create function private.ist_week_start(p_at timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', p_at at time zone 'Asia/Kolkata')::date;
$$;

create function private.require_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

create function app.age_band(p_birth_year smallint)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_birth_year is null then null
    when extract(year from now())::int - p_birth_year <= 20 then '18–20'
    when extract(year from now())::int - p_birth_year <= 24 then '21–24'
    when extract(year from now())::int - p_birth_year <= 30 then '25–30'
    else '30+'
  end;
$$;

-- Increments a period-keyed counter and returns the new value (row-locked upsert).
create function private.bump_counter(p_user uuid, p_kind text, p_period date, p_delta int default 1)
returns int
language sql
security definer
set search_path = ''
as $$
  insert into public.usage_counters as uc (user_id, kind, period_start, count)
  values (p_user, p_kind, p_period, greatest(p_delta, 0))
  on conflict (user_id, kind, period_start)
  do update set count = greatest(uc.count + p_delta, 0)
  returning count;
$$;

-- -----------------------------------------------------------------------------
-- Admin claims (S-43, S-44)
-- -----------------------------------------------------------------------------
create function app.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'app_role') in ('reviewer', 'admin') and (auth.jwt() ->> 'aal') = 'aal2',
    false
  );
$$;

create function app.is_full_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'app_role') = 'admin' and (auth.jwt() ->> 'aal') = 'aal2', false);
$$;

-- -----------------------------------------------------------------------------
-- People
-- -----------------------------------------------------------------------------
create function app.is_active(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = p_uid and p.status = 'active');
$$;

create function app.is_verified(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_uid and p.status = 'active' and p.verification_status = 'verified'
  );
$$;

create function app.is_verified_woman(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_uid
      and p.status = 'active'
      and p.verification_status = 'verified'
      and p.verified_gender = 'woman'
  );
$$;

create function app.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b) or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

-- S-14, S-17, S-18: another user's profile is visible when both are in the same city,
-- the target is active, and neither has blocked the other.
create function app.can_view_profile(p_viewer uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_viewer = p_target
    or app.is_admin()
    or exists (
      select 1
      from public.profiles t
      join public.profiles v on v.id = p_viewer
      where t.id = p_target
        and t.status = 'active'
        and v.status in ('active', 'suspended')
        and t.city_id = v.city_id
        and not app.is_blocked_between(p_viewer, p_target)
    );
$$;

-- -----------------------------------------------------------------------------
-- Plans (S-14, S-15, S-16, S-17)
-- -----------------------------------------------------------------------------
create function app.can_see_plan(p_uid uuid, p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.plans pl
    join public.profiles caller on caller.id = p_uid
    where pl.id = p_plan_id
      and (
        app.is_admin()
        or pl.host_id = p_uid
        or (
          caller.status = 'active'
          and pl.city_id = caller.city_id
          and not app.is_blocked_between(p_uid, pl.host_id)
          and (
            pl.audience = 'everyone'
            or (pl.audience = 'women_only' and app.is_verified_woman(p_uid))
            or (pl.audience = 'same_college' and pl.college_id = caller.college_id)
          )
        )
        or exists (
          -- Members keep access to plans they belong to, even after they start or end.
          select 1 from public.plan_members pm
          where pm.plan_id = pl.id
            and pm.user_id = p_uid
            and pm.status in ('approved', 'attended', 'no_show')
        )
      )
  );
$$;

create function app.is_plan_member(p_uid uuid, p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plan_members pm
    where pm.plan_id = p_plan_id
      and pm.user_id = p_uid
      and pm.status in ('approved', 'attended', 'no_show')
  );
$$;

create function app.is_conversation_member(p_uid uuid, p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.plan_members pm on pm.plan_id = c.plan_id
    where c.id = p_conversation_id
      and pm.user_id = p_uid
      and pm.status in ('approved', 'attended', 'no_show')
  );
$$;

-- Storage access for the private media bucket (S-21, S-22). Paths:
--   profiles/{user_id}/{photo_id}.jpg
--   chat/{conversation_id}/{message_id}.jpg
--   venues/{venue_id}/{photo_id}.jpg
create function app.can_read_media(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case split_part(p_name, '/', 1)
    when 'profiles' then exists (
      select 1 from public.profile_photos ph
      where ph.path = p_name
        and (
          ph.user_id = auth.uid()
          or app.is_admin()
          or (ph.status = 'approved' and app.can_view_profile(auth.uid(), ph.user_id))
        )
    )
    when 'chat' then exists (
      select 1 from public.messages m
      where m.image_path = p_name
        and (
          app.is_admin()
          or m.sender_id = auth.uid()
          or (
            m.status = 'visible'
            and m.image_status = 'approved'
            and app.is_conversation_member(auth.uid(), m.conversation_id)
            and not app.is_blocked_between(auth.uid(), m.sender_id)
          )
        )
    )
    when 'venues' then auth.uid() is not null
    else false
  end;
$$;

grant execute on all functions in schema app to authenticated, service_role;
revoke execute on all functions in schema private from public, anon, authenticated;
