-- Plan banners, chat "delete for me", Premium (Razorpay) and email-verified account deletion.

-- -----------------------------------------------------------------------------
-- Plan banners (1:1 cover photo chosen by the host, moderated like every upload)
-- -----------------------------------------------------------------------------
create table public.plan_covers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quarantine_path text not null,
  path text null,
  sha256 text null,
  status public.media_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plan_covers_user_idx on public.plan_covers (user_id);
alter table public.plan_covers enable row level security;
grant select on public.plan_covers to authenticated;
create policy plan_covers_read_own on public.plan_covers for select to authenticated
  using (user_id = auth.uid() or app.is_admin());

alter table public.plans add column cover_id uuid null references public.plan_covers (id) on delete set null;

-- Host attaches an uploaded banner to their upcoming plan (null removes it).
create function public.set_plan_cover(p_plan_id uuid, p_cover_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  if p_cover_id is not null and not exists (
    select 1 from public.plan_covers pc
    where pc.id = p_cover_id and pc.user_id = v_uid and pc.status <> 'rejected'
  ) then
    perform private.fail('That banner is not available.', 'FORBIDDEN');
  end if;
  update public.plans set cover_id = p_cover_id
  where id = p_plan_id and host_id = v_uid and status in ('open', 'full');
  if not found then
    perform private.fail('Only the host can change the banner of an upcoming plan.', 'FORBIDDEN');
  end if;
end;
$$;

create or replace function public.svc_register_upload(
  p_user uuid, p_kind text, p_quarantine_path text, p_position int default null,
  p_conversation_id uuid default null, p_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if split_part(p_quarantine_path, '/', 1) <> p_user::text then
    raise exception 'Upload path does not belong to the caller';
  end if;

  if p_kind = 'profile' then
    if (select count(*) from public.profile_photos where user_id = p_user) >= 6 then
      raise exception using errcode = 'P0001', message = 'You can add up to 6 photos.', hint = 'MAX_PHOTOS';
    end if;
    insert into public.profile_photos (user_id, quarantine_path, position)
    values (p_user, p_quarantine_path, coalesce(p_position, 0))
    returning id into v_id;
  elsif p_kind = 'chat' then
    if not app.is_verified(p_user) or not exists (
      select 1 from public.conversations c
      join public.plan_members pm on pm.plan_id = c.plan_id
      where c.id = p_conversation_id and c.status = 'open'
        and pm.user_id = p_user and pm.status in ('approved', 'attended')
    ) or exists (
      select 1 from public.conversation_mutes cm where cm.conversation_id = p_conversation_id and cm.user_id = p_user
    ) then
      raise exception using errcode = 'P0001', message = 'You can''t post in this chat.', hint = 'FORBIDDEN';
    end if;
    -- Held until moderation passes (CH-2: photos pass AI check before delivery).
    insert into public.messages (id, conversation_id, sender_id, image_path, image_status, status)
    values (p_message_id, p_conversation_id, p_user, null, 'pending', 'held')
    returning id into v_id;
  elsif p_kind = 'plan' then
    if not app.is_verified(p_user) then
      raise exception using errcode = 'P0001', message = 'Verify your account to host plans.', hint = 'VERIFY_REQUIRED';
    end if;
    if (select count(*) from public.plan_covers where user_id = p_user and created_at > now() - interval '1 day') >= 10 then
      raise exception using errcode = 'P0001', message = 'You''ve uploaded a lot of banners today. Try again tomorrow.', hint = 'CAP_REACHED';
    end if;
    insert into public.plan_covers (user_id, quarantine_path)
    values (p_user, p_quarantine_path)
    returning id into v_id;
  else
    raise exception 'Unknown upload kind';
  end if;
  return v_id;
end;
$$;

create or replace function public.svc_apply_media(
  p_kind text,
  p_id uuid,
  p_sha256 text,
  p_media_path text,
  p_labels jsonb,
  p_top_confidence numeric,
  p_faces int,
  p_provider_error boolean
)
returns public.media_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cached public.verdict;
  v_verdict public.verdict;
  v_labels jsonb := coalesce(p_labels, '[]'::jsonb);
  v_status public.media_status;
  v_user uuid;
begin
  select m.verdict into v_cached from private.media_moderation m where m.sha256 = p_sha256;
  v_verdict := case
    when v_cached is not null then v_cached
    when p_provider_error then 'review'
    when coalesce(p_top_confidence, 0) >= private.setting('rekognition_reject')::numeric then 'fail'
    when coalesce(p_top_confidence, 0) >= private.setting('rekognition_review')::numeric then 'review'
    when p_kind = 'profile' and coalesce(p_faces, 0) = 0 then 'review'
    else 'pass'
  end;
  if p_kind = 'profile' and v_cached is null and not p_provider_error and coalesce(p_faces, 0) = 0 then
    v_labels := v_labels || '["no_face"]'::jsonb;
  end if;
  if v_cached is null and not p_provider_error then
    insert into private.media_moderation (sha256, verdict, labels) values (p_sha256, v_verdict, v_labels)
    on conflict (sha256) do nothing;
  end if;

  v_status := case v_verdict when 'pass' then 'approved' when 'fail' then 'rejected' else 'pending' end;
  if p_kind = 'profile' then
    update public.profile_photos
    set status = v_status, path = p_media_path, sha256 = p_sha256,
        reject_reason = case when v_status = 'rejected' then 'This photo breaks the photo rules.' end
    where id = p_id
    returning user_id into v_user;
  elsif p_kind = 'plan' then
    update public.plan_covers
    set status = v_status, path = p_media_path, sha256 = p_sha256, updated_at = now()
    where id = p_id
    returning user_id into v_user;
  else
    update public.messages
    set image_status = v_status, image_path = p_media_path,
        status = case v_status when 'approved' then 'visible' when 'rejected' then 'rejected' else 'held' end::public.content_status
    where id = p_id
    returning sender_id into v_user;
  end if;
  if v_user is null then
    raise exception 'Upload not found';
  end if;

  if v_verdict <> 'pass' then
    insert into public.moderation_queue (subject, subject_id, user_id, ai_verdict, ai_score, ai_labels, due_at)
    values ('photo', p_id, v_user, v_verdict, p_top_confidence, v_labels, now() + interval '24 hours');
  end if;
  return v_status;
end;
$$;

-- Moderator decisions on a banner (admin_decide updates profile photos and chat photos;
-- banners follow the same queue item through this trigger).
create function private.apply_cover_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.subject = 'photo' and new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    update public.plan_covers
    set status = case when new.status = 'approved' then 'approved' else 'rejected' end::public.media_status,
        updated_at = now()
    where id = new.subject_id;
  end if;
  return new;
end;
$$;
create trigger moderation_queue_cover_decision
  after update of status on public.moderation_queue
  for each row execute function private.apply_cover_decision();

create or replace function app.can_read_media(p_name text)
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
    when 'plans' then exists (
      select 1 from public.plan_covers pc
      where pc.path = p_name
        and (
          pc.user_id = auth.uid()
          or app.is_admin()
          or (
            pc.status = 'approved'
            and exists (select 1 from public.plans pl where pl.cover_id = pc.id and app.can_see_plan(auth.uid(), pl.id))
          )
        )
    )
    when 'venues' then auth.uid() is not null
    else false
  end;
$$;

-- -----------------------------------------------------------------------------
-- Chat: "delete for me" and a 10-minute "delete for everyone" window
-- -----------------------------------------------------------------------------
create table public.message_hides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table public.message_hides enable row level security;
grant select on public.message_hides to authenticated;
create policy message_hides_read_own on public.message_hides for select to authenticated
  using (user_id = auth.uid());

drop policy messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (
    app.is_admin()
    or (
      not exists (select 1 from public.message_hides h where h.message_id = messages.id and h.user_id = auth.uid())
      and (
        sender_id = auth.uid()
        or (
          status = 'visible'
          and app.is_conversation_member(auth.uid(), conversation_id)
          and not app.is_blocked_between(auth.uid(), sender_id)
        )
      )
    )
  );

create function public.hide_messages(p_message_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  if coalesce(array_length(p_message_ids, 1), 0) > 100 then
    perform private.fail('Select up to 100 messages at a time.');
  end if;
  insert into public.message_hides (user_id, message_id)
  select v_uid, m.id from public.messages m
  where m.id = any (p_message_ids)
    and (m.sender_id = v_uid or app.is_conversation_member(v_uid, m.conversation_id))
  on conflict do nothing;
end;
$$;

create or replace function public.delete_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.messages set status = 'rejected'
  where id = p_message_id and sender_id = private.require_uid() and created_at >= now() - interval '10 minutes';
  if not found then
    perform private.fail('Messages can only be deleted for everyone within 10 minutes.', 'FORBIDDEN');
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Premium: Razorpay passes. Only payments-verify / razorpay-webhook mark a payment paid.
-- -----------------------------------------------------------------------------
alter table public.profiles add column entitlement_until timestamptz null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null,
  tier public.entitlement not null check (tier <> 'free'),
  days int not null check (days between 1 and 366),
  amount_paise int not null check (amount_paise > 0),
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'expired')),
  razorpay_link_id text null unique,
  razorpay_payment_id text null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz null
);
create index payments_user_idx on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
grant select on public.payments to authenticated;
create policy payments_read_own on public.payments for select to authenticated
  using (user_id = auth.uid() or app.is_admin());

-- Idempotent: a second call for the same payment changes nothing.
create function public.svc_apply_payment(p_payment uuid, p_razorpay_payment_id text)
returns public.entitlement
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.payments;
  v_profile public.profiles;
begin
  select * into v_pay from public.payments where id = p_payment for update;
  if v_pay.id is null then
    raise exception 'Payment not found';
  end if;
  select * into v_profile from public.profiles where id = v_pay.user_id for update;
  if v_pay.status = 'paid' then
    return v_profile.entitlement;
  end if;

  update public.payments
  set status = 'paid', paid_at = now(), razorpay_payment_id = coalesce(p_razorpay_payment_id, razorpay_payment_id)
  where id = p_payment;

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

-- Every 15 minutes: passes that ran out go back to free.
create function private.entitlement_tick()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set entitlement = 'free', entitlement_until = null
  where entitlement <> 'free' and entitlement_until is not null and entitlement_until <= now();
  update public.payments set status = 'expired'
  where status = 'created' and created_at < now() - interval '1 day';
$$;
select cron.schedule('entitlement_tick', '*/15 * * * *', 'select private.entitlement_tick()');

create or replace function public.my_caps()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_week date := private.ist_week_start();
begin
  return jsonb_build_object(
    'entitlement', v_profile.entitlement,
    'entitlement_until', v_profile.entitlement_until,
    'joins_used', coalesce((select count from public.usage_counters
      where user_id = v_profile.id and kind = 'join_week' and period_start = v_week), 0),
    'joins_limit', private.setting_int('free_joins_per_week'),
    'hosts_used', coalesce((select count from public.usage_counters
      where user_id = v_profile.id and kind = 'host_week' and period_start = v_week), 0),
    'hosts_limit', private.setting_int('free_hosts_per_week')
  );
end;
$$;

-- Premium perks read from the views: priority requests (host queue) and boosted plans (feed).
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
  )) as has_custom_cover
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
  (p.entitlement = 'premium') as is_priority
from public.plan_members pm
join public.plans pl on pl.id = pm.plan_id
join public.profiles p on p.id = pm.user_id
left join public.profile_stats ps on ps.user_id = pm.user_id
where pl.host_id = auth.uid()
  and pm.user_id <> pl.host_id
  and pm.status in ('requested', 'approved', 'declined')
  and not app.is_blocked_between(auth.uid(), pm.user_id);

-- -----------------------------------------------------------------------------
-- Account deletion: 6-digit code sent to the user's email, checked by delete-account
-- -----------------------------------------------------------------------------
create table private.deletion_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hmac text not null,
  email text not null,
  attempts smallint not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create function public.svc_deletion_code_store(p_user uuid, p_code_hmac text, p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.deletion_codes (user_id, code_hmac, email, attempts, expires_at)
  values (p_user, p_code_hmac, p_email, 0, now() + interval '10 minutes')
  on conflict (user_id) do update
  set code_hmac = excluded.code_hmac, email = excluded.email, attempts = 0,
      expires_at = excluded.expires_at, created_at = now();
$$;

-- Returns 'ok', 'invalid', 'expired' or 'locked'. Five wrong codes void the code.
create function public.svc_deletion_code_check(p_user uuid, p_code_hmac text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.deletion_codes;
begin
  select * into v_row from private.deletion_codes where user_id = p_user for update;
  if v_row.user_id is null or v_row.expires_at <= now() then
    return 'expired';
  end if;
  if v_row.attempts >= 5 then
    return 'locked';
  end if;
  if v_row.code_hmac = p_code_hmac then
    delete from private.deletion_codes where user_id = p_user;
    return 'ok';
  end if;
  update private.deletion_codes set attempts = attempts + 1 where user_id = p_user;
  return 'invalid';
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke execute on function
  public.set_plan_cover(uuid, uuid), public.hide_messages(uuid[]),
  public.svc_apply_payment(uuid, text),
  public.svc_deletion_code_store(uuid, text, text), public.svc_deletion_code_check(uuid, text)
from public, anon, authenticated;

grant execute on function public.set_plan_cover(uuid, uuid), public.hide_messages(uuid[]) to authenticated;
grant execute on function
  public.svc_apply_payment(uuid, text),
  public.svc_deletion_code_store(uuid, text, text), public.svc_deletion_code_check(uuid, text)
to service_role;
grant select on public.plan_cards, public.join_requests to authenticated;
