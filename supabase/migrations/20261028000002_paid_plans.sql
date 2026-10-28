-- Paid plans: the host sets a price per person; approved members pay through Razorpay to
-- confirm their seat. The platform keeps a fee and the rest is owed to the host, paid out
-- to the host's UPI ID. Refunds go back automatically when a paid seat is lost.

insert into private.settings (key, val) values
  ('platform_fee_bps', '1000'),       -- 10% platform fee on each paid seat
  ('plan_price_min_paise', '4900'),   -- ₹49
  ('plan_price_max_paise', '500000'), -- ₹5,000
  ('seat_pay_hours', '12'),           -- approved members have this long to pay
  ('refund_leave_hours', '24')        -- leaving earlier than this before start is refunded
on conflict (key) do update set val = excluded.val, updated_at = now();

alter table public.plan_members
  add column paid_at timestamptz null,
  add column pay_by timestamptz null;

-- -----------------------------------------------------------------------------
-- Payments now cover Premium passes and plan seats
-- -----------------------------------------------------------------------------
alter table public.payments
  add column kind text not null default 'premium' check (kind in ('premium', 'plan')),
  add column plan_id uuid null references public.plans (id) on delete set null,
  add column host_id uuid null references public.profiles (id) on delete set null,
  add column platform_fee_paise int not null default 0 check (platform_fee_paise >= 0),
  add column host_payout_paise int not null default 0 check (host_payout_paise >= 0),
  add column refund_id text null,
  add column refunded_at timestamptz null;
alter table public.payments alter column tier drop not null, alter column days drop not null;
alter table public.payments drop constraint payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('created', 'paid', 'failed', 'expired', 'refund_pending', 'refunded'));
alter table public.payments add constraint payments_kind_shape check (
  (kind = 'premium' and tier is not null and days is not null)
  or (kind = 'plan' and plan_id is not null and tier is null and days is null)
);
create index payments_plan_idx on public.payments (plan_id) where plan_id is not null;
create index payments_host_idx on public.payments (host_id) where host_id is not null;
create index payments_refund_idx on public.payments (status) where status = 'refund_pending';

-- -----------------------------------------------------------------------------
-- Host payout details (UPI ID) and payouts recorded by admins
-- -----------------------------------------------------------------------------
create table public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  upi_id text not null check (upi_id ~ '^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$'),
  holder_name text not null check (char_length(holder_name) between 2 and 60),
  updated_at timestamptz not null default now()
);
alter table public.payout_accounts enable row level security;
grant select on public.payout_accounts to authenticated;
create policy payout_accounts_read_own on public.payout_accounts for select to authenticated
  using (user_id = auth.uid() or app.is_admin());

create table public.host_payouts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  amount_paise int not null check (amount_paise > 0),
  reference text null,
  paid_by uuid null references auth.users (id),
  created_at timestamptz not null default now()
);
alter table public.host_payouts enable row level security;
grant select on public.host_payouts to authenticated;
create policy host_payouts_read_own on public.host_payouts for select to authenticated
  using (host_id = auth.uid() or app.is_admin());

create function public.set_payout_account(p_upi_id text, p_holder_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  insert into public.payout_accounts (user_id, upi_id, holder_name)
  values (v_uid, lower(btrim(p_upi_id)), btrim(p_holder_name))
  on conflict (user_id) do update
  set upi_id = excluded.upi_id, holder_name = excluded.holder_name, updated_at = now();
exception when check_violation then
  perform private.fail('Enter a valid UPI ID, like name@okaxis.');
end;
$$;

-- -----------------------------------------------------------------------------
-- Price: set by the host right after creating the plan, before anyone has joined
-- -----------------------------------------------------------------------------
create function public.set_plan_price(p_plan_id uuid, p_price_paise int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan_id for update;
  if v_plan.id is null or v_plan.host_id is distinct from v_uid or v_plan.status not in ('open', 'full') then
    perform private.fail('Only the host can price an upcoming plan.', 'FORBIDDEN');
  end if;
  if exists (select 1 from public.plan_members pm where pm.plan_id = p_plan_id and pm.user_id <> v_uid) then
    perform private.fail('The price can''t change once people have joined.', 'LOCKED');
  end if;
  if p_price_paise is not null and (
    p_price_paise < private.setting_int('plan_price_min_paise')
    or p_price_paise > private.setting_int('plan_price_max_paise')
    or p_price_paise % 100 <> 0
  ) then
    perform private.fail('Set a whole-rupee price between ₹49 and ₹5,000.', 'PRICE');
  end if;
  update public.plans set price_paise = p_price_paise where id = p_plan_id;
end;
$$;

-- A seat on a paid plan is held for seat_pay_hours after approval (never past 1 hour before start).
create function private.set_pay_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') and new.paid_at is null then
    select * into v_plan from public.plans where id = new.plan_id;
    if v_plan.price_paise is not null and new.user_id <> v_plan.host_id then
      new.pay_by := least(now() + make_interval(hours => private.setting_int('seat_pay_hours')), v_plan.starts_at - interval '1 hour');
      if new.pay_by < now() + interval '15 minutes' then
        new.pay_by := now() + interval '15 minutes';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger plan_members_pay_by
  before insert or update of status on public.plan_members
  for each row execute function private.set_pay_by();

-- -----------------------------------------------------------------------------
-- Payment confirmation (Premium pass or plan seat). Idempotent.
-- -----------------------------------------------------------------------------
create or replace function public.svc_apply_payment(p_payment uuid, p_razorpay_payment_id text)
returns public.entitlement
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.payments;
  v_profile public.profiles;
  v_plan public.plans;
  v_member public.plan_members;
begin
  select * into v_pay from public.payments where id = p_payment for update;
  if v_pay.id is null then
    raise exception 'Payment not found';
  end if;
  select * into v_profile from public.profiles where id = v_pay.user_id for update;
  -- A late confirmation of an expired link still counts: the money was taken.
  if v_pay.status not in ('created', 'expired', 'failed') then
    return v_profile.entitlement;
  end if;

  update public.payments
  set status = 'paid', paid_at = now(), razorpay_payment_id = coalesce(p_razorpay_payment_id, razorpay_payment_id)
  where id = p_payment;

  if v_pay.kind = 'plan' then
    select * into v_plan from public.plans where id = v_pay.plan_id for update;
    select * into v_member from public.plan_members
    where plan_id = v_pay.plan_id and user_id = v_pay.user_id for update;
    if v_plan.status in ('open', 'full') and v_member.status = 'approved' and v_member.paid_at is null then
      update public.plan_members set paid_at = now(), pay_by = null
      where plan_id = v_pay.plan_id and user_id = v_pay.user_id;
      perform private.notify(v_pay.user_id, 'plan', 'seat_paid', 'Seat confirmed',
        'Your seat for ' || v_plan.title || ' is paid and confirmed.', v_plan.id);
      if v_plan.host_id is not null then
        perform private.notify(v_plan.host_id, 'plan', 'seat_paid_host', 'New paid seat',
          v_profile.first_name || ' paid for ' || v_plan.title || '.', v_plan.id);
      end if;
    else
      -- The seat was lost before the money arrived (expired, plan cancelled, already paid).
      update public.payments set status = 'refund_pending' where id = p_payment;
      perform private.call_function('payments-refunds', '{}'::jsonb);
    end if;
    return v_profile.entitlement;
  end if;

  update public.profiles
  set entitlement = greatest(entitlement, v_pay.tier),
      entitlement_until = greatest(coalesce(entitlement_until, now()), now()) + make_interval(days => v_pay.days)
  where id = v_pay.user_id;

  insert into public.notifications (user_id, category, kind, title, body)
  values (v_pay.user_id, 'account', 'premium_started',
          case v_pay.tier when 'premium' then 'Welcome to Premium' else 'Welcome to Plus' end,
          'Your pass is active. Unlimited joins and hosting are on.');

  insert into private.analytics_outbox (event, distinct_id, city_slug, props)
  select 'subscription_started', v_pay.user_id, coalesce(c.slug, 'unknown'), jsonb_build_object('product_id', v_pay.product_id)
  from public.profiles p left join public.cities c on c.id = p.city_id
  where p.id = v_pay.user_id;

  return greatest(v_profile.entitlement, v_pay.tier);
end;
$$;

-- -----------------------------------------------------------------------------
-- Refunds: a paid seat that is lost goes back to the payer
-- -----------------------------------------------------------------------------
create function private.refund_seat(p_plan_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments set status = 'refund_pending'
  where plan_id = p_plan_id and user_id = p_user_id and kind = 'plan' and status = 'paid';
  if found then
    perform private.notify(p_user_id, 'plan', 'seat_refund', 'Refund on its way',
      'Your payment for this plan is being refunded. It usually reaches you in 5-7 days.', p_plan_id);
    perform private.call_function('payments-refunds', '{}'::jsonb);
  end if;
end;
$$;

create function private.on_member_refund()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_starts timestamptz;
begin
  if old.status = 'approved' and old.paid_at is not null and new.status in ('left', 'removed', 'expired') then
    select starts_at into v_starts from public.plans where id = new.plan_id;
    if new.status <> 'left' or v_starts > now() + make_interval(hours => private.setting_int('refund_leave_hours')) then
      perform private.refund_seat(new.plan_id, new.user_id);
    end if;
  end if;
  return new;
end;
$$;
create trigger plan_members_refund
  after update of status on public.plan_members
  for each row execute function private.on_member_refund();

create function private.on_plan_cancel_refund()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    for m in select distinct p.user_id from public.payments p
      where p.plan_id = new.id and p.kind = 'plan' and p.status = 'paid'
    loop
      perform private.refund_seat(new.id, m.user_id);
    end loop;
  end if;
  return new;
end;
$$;
create trigger plans_cancel_refund
  after update of status on public.plans
  for each row execute function private.on_plan_cancel_refund();

-- Used by the payments-refunds worker.
create function public.svc_refund_done(p_payment uuid, p_refund_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set status = 'refunded', refund_id = p_refund_id, refunded_at = now()
  where id = p_payment and status = 'refund_pending';
$$;

-- Every 15 minutes: unpaid seats past their deadline are released; refunds are retried.
create function private.seat_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  for m in
    select pm.plan_id, pm.user_id, pl.title, pl.starts_at from public.plan_members pm
    join public.plans pl on pl.id = pm.plan_id
    where pm.status = 'approved' and pm.paid_at is null and pm.pay_by is not null and pm.pay_by <= now()
  loop
    update public.plan_members set status = 'expired', decided_at = now()
    where plan_id = m.plan_id and user_id = m.user_id;
    perform private.return_join_slot(m.user_id, m.starts_at);
    perform private.notify(m.user_id, 'plan', 'seat_released', 'Seat released',
      'Your seat for ' || m.title || ' was released because it wasn''t paid in time.', m.plan_id);
  end loop;
  if exists (select 1 from public.payments where status = 'refund_pending') then
    perform private.call_function('payments-refunds', '{}'::jsonb);
  end if;
end;
$$;
select cron.schedule('seat_tick', '*/15 * * * *', 'select private.seat_tick()');

-- -----------------------------------------------------------------------------
-- Host earnings
-- -----------------------------------------------------------------------------
create function public.my_earnings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select p.*, pl.title, pl.starts_at, pl.status as plan_status
    from public.payments p
    join public.plans pl on pl.id = p.plan_id
    where p.kind = 'plan' and p.host_id = auth.uid() and p.status = 'paid'
  )
  select jsonb_build_object(
    'earned_paise', coalesce((select sum(host_payout_paise) from mine where plan_status = 'completed'), 0),
    'upcoming_paise', coalesce((select sum(host_payout_paise) from mine where plan_status <> 'completed'), 0),
    'fees_paise', coalesce((select sum(platform_fee_paise) from mine), 0),
    'paid_out_paise', coalesce((select sum(amount_paise) from public.host_payouts where host_id = auth.uid()), 0),
    'fee_bps', private.setting_int('platform_fee_bps'),
    'plans', coalesce((
      select jsonb_agg(row_to_json(x) order by x.starts_at desc) from (
        select plan_id, title, starts_at, plan_status, count(*) as seats,
               sum(amount_paise) as gross_paise, sum(host_payout_paise) as payout_paise
        from mine group by plan_id, title, starts_at, plan_status
        order by starts_at desc limit 20
      ) x
    ), '[]'::jsonb)
  );
$$;

-- -----------------------------------------------------------------------------
-- Views: price and the viewer's payment state
-- -----------------------------------------------------------------------------
create or replace view public.plan_cards
with (security_barrier = true)
as
select
  pl.id,
  pl.city_id,
  pl.host_id,
  hp.first_name as host_first_name,
  (hp.verification_status = 'verified') as host_verified,
  app.age_band(hp.birth_year) as host_age_band,
  hc.name as host_college,
  (select ph.path from public.profile_photos ph
   where ph.user_id = pl.host_id and ph.status = 'approved' and ph.path is not null
   order by ph.position limit 1) as host_photo_path,
  coalesce(hps.plans_hosted, 0) as host_plans_hosted,
  coalesce(hps.late_cancel_count_30d, 0) as host_late_cancels_30d,
  pl.venue_id,
  v.name as venue_name,
  v.area_name as venue_area_name,
  v.address_line as venue_address,
  v.partner as venue_partner,
  v.lat as venue_lat,
  v.lng as venue_lng,
  coalesce(
    (select pc.path from public.plan_covers pc
     where pc.id = pl.cover_id and (pc.status = 'approved' or pc.user_id = auth.uid())),
    (select vp.path from public.venue_photos vp
     where vp.venue_id = v.id and vp.status = 'approved'
     order by vp.position limit 1)
  ) as cover_path,
  pl.title,
  pl.description,
  pl.activity,
  pl.starts_at,
  pl.ends_at,
  pl.capacity,
  pl.approved_count,
  pl.audience,
  pl.requires_approval,
  pl.status,
  pl.late_cancel,
  pl.cancel_reason,
  (select pm.status from public.plan_members pm
   where pm.plan_id = pl.id and pm.user_id = auth.uid()) as my_status,
  (select pm.checked_in_at from public.plan_members pm
   where pm.plan_id = pl.id and pm.user_id = auth.uid()) as my_checked_in_at,
  (select c.id from public.conversations c where c.plan_id = pl.id) as conversation_id,
  coalesce(
    (select array_agg(sub.first_name order by sub.decided_at)
     from (
       select mp.first_name, pm.decided_at
       from public.plan_members pm
       join public.profiles mp on mp.id = pm.user_id
       where pm.plan_id = pl.id
         and pm.status in ('approved', 'attended')
         and not app.is_blocked_between(auth.uid(), pm.user_id)
       order by pm.decided_at
       limit 4
     ) sub),
    '{}'
  ) as member_names,
  (hp.entitlement = 'premium') as host_boosted,
  (pl.cover_id is not null and exists (
    select 1 from public.plan_covers pc where pc.id = pl.cover_id and pc.status = 'approved'
  )) as has_custom_cover,
  pl.price_paise,
  (select pm.paid_at from public.plan_members pm
   where pm.plan_id = pl.id and pm.user_id = auth.uid()) as my_paid_at,
  (select pm.pay_by from public.plan_members pm
   where pm.plan_id = pl.id and pm.user_id = auth.uid()) as my_pay_by
from public.plans pl
join public.profiles hp on hp.id = pl.host_id
left join public.colleges hc on hc.id = hp.college_id
left join public.profile_stats hps on hps.user_id = pl.host_id
join public.venues v on v.id = pl.venue_id
where app.can_see_plan(auth.uid(), pl.id);

create or replace view public.join_requests
with (security_barrier = true)
as
select
  pm.plan_id,
  pm.user_id,
  p.first_name,
  app.age_band(p.birth_year) as age_band,
  (p.verification_status = 'verified') as is_verified,
  p.interests,
  (select ph.path from public.profile_photos ph
   where ph.user_id = pm.user_id and ph.status = 'approved' and ph.path is not null
   order by ph.position limit 1) as photo_path,
  coalesce(ps.plans_attended, 0) as plans_attended,
  case
    when coalesce(ps.plans_attended, 0) + coalesce(ps.plans_no_show, 0) >= 3
    then round(ps.plans_attended::numeric * 100 / (ps.plans_attended + ps.plans_no_show))::int
  end as show_up_rate,
  (coalesce(ps.plans_no_show, 0) >= 3) as low_priority,
  pm.note,
  pm.status,
  pm.requested_at,
  (p.entitlement = 'premium') as is_priority,
  pm.paid_at
from public.plan_members pm
join public.plans pl on pl.id = pm.plan_id
join public.profiles p on p.id = pm.user_id
left join public.profile_stats ps on ps.user_id = pm.user_id
where pl.host_id = auth.uid()
  and pm.user_id <> pl.host_id
  and pm.status in ('requested', 'approved', 'declined')
  and not app.is_blocked_between(auth.uid(), pm.user_id);

-- Read-only settings for Edge Functions (platform fee).
create function public.svc_setting(p_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.setting(p_key);
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke execute on function
  public.set_plan_price(uuid, int), public.set_payout_account(text, text), public.my_earnings(),
  public.svc_refund_done(uuid, text), public.svc_setting(text)
from public, anon, authenticated;
grant execute on function public.set_plan_price(uuid, int), public.set_payout_account(text, text), public.my_earnings() to authenticated;
grant execute on function public.svc_refund_done(uuid, text), public.svc_setting(text), public.svc_apply_payment(uuid, text) to service_role;
grant select on public.plan_cards, public.join_requests to authenticated;
