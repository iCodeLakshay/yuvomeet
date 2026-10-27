-- Client RPCs. Every function is security definer, starts with auth.uid(),
-- and raises errors whose message is safe to show in the app (hint = machine code).

create function private.fail(p_message text, p_code text default 'INVALID')
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_message, hint = p_code;
end;
$$;

-- S-12: revoke every refresh token and session of a user (ban, suspension, minor, deletion).
-- Access tokens expire within the hour and RLS already refuses inactive accounts.
create function private.revoke_sessions(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regclass('auth.sessions') is not null then
    delete from auth.sessions where user_id = p_user;
  end if;
  if to_regclass('auth.refresh_tokens') is not null then
    delete from auth.refresh_tokens where user_id = p_user::text;
  end if;
end;
$$;

create function private.current_profile()
returns public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.profiles;
begin
  select * into v from public.profiles where id = private.require_uid();
  if v.id is null then
    perform private.fail('Account not found.', 'NOT_FOUND');
  end if;
  if v.status in ('banned', 'deleted') then
    perform private.fail('This account is not available.', 'ACCOUNT_CLOSED');
  end if;
  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- Onboarding (ON-2, ON-3, ON-4)
-- -----------------------------------------------------------------------------
create function public.select_city(p_city_id uuid)
returns public.city_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_status public.city_status;
begin
  select c.status into v_status from public.cities c where c.id = p_city_id;
  if v_status is null then
    perform private.fail('City not found.', 'NOT_FOUND');
  end if;

  if v_status in ('live', 'beta') then
    update public.profiles set city_id = p_city_id where id = v_profile.id;
  else
    insert into public.waitlist_signups (user_id, city_id) values (v_profile.id, p_city_id)
    on conflict do nothing;
  end if;
  return v_status;
end;
$$;

-- Null arguments leave a field unchanged. Declared gender is set once (S-42).
create function public.save_profile(
  p_first_name text default null,
  p_declared_gender public.gender default null,
  p_bio text default null,
  p_interests text[] default null,
  p_languages text[] default null,
  p_area_name text default null,
  p_area_cell text default null,
  p_college_id uuid default null,
  p_clear_college boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
begin
  if p_first_name is not null and char_length(btrim(p_first_name)) not between 2 and 30 then
    perform private.fail('First name must be 2 to 30 characters.');
  end if;
  if p_bio is not null and char_length(p_bio) > 300 then
    perform private.fail('Bio can be at most 300 characters.');
  end if;
  if p_interests is not null and (
    cardinality(p_interests) > 8
    or exists (select 1 from unnest(p_interests) i where i not in (select slug from public.interests))
  ) then
    perform private.fail('Pick up to 8 interests from the list.');
  end if;
  if p_languages is not null and (
    cardinality(p_languages) = 0 or not (p_languages <@ array['en', 'hi'])
  ) then
    perform private.fail('Pick at least one language.');
  end if;
  if p_area_cell is not null and p_area_cell !~ '^[0-9a-f]{15}$' then
    perform private.fail('Pick your area from the list.');
  end if;
  if p_college_id is not null and not exists (
    select 1 from public.colleges c
    where c.id = p_college_id and c.status = 'active' and c.city_id = v_profile.city_id
  ) then
    perform private.fail('Pick a college from your city.');
  end if;
  if p_declared_gender is not null and v_profile.declared_gender is not null
     and p_declared_gender <> v_profile.declared_gender then
    perform private.fail('Gender can only be changed through support.', 'GENDER_LOCKED');
  end if;

  update public.profiles set
    first_name = coalesce(btrim(p_first_name), first_name),
    declared_gender = coalesce(declared_gender, p_declared_gender),
    bio = case when p_bio is null then bio else nullif(btrim(p_bio), '') end,
    interests = coalesce(p_interests, interests),
    languages = coalesce(p_languages, languages),
    area_name = coalesce(p_area_name, area_name),
    area_cell = coalesce(p_area_cell, area_cell),
    college_id = case when p_clear_college then null else coalesce(p_college_id, college_id) end
  where id = v_profile.id;
end;
$$;

create function public.accept_rules(p_policy_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
begin
  update public.profiles set rules_accepted_at = now() where id = v_profile.id;
  insert into public.consents (user_id, purpose, granted, policy_version)
  values (v_profile.id, 'community_rules', true, p_policy_version);
end;
$$;

-- ON-3: active only with name, gender, area, city, 2+ approved photos, 2+ interests, rules.
create function public.complete_profile()
returns public.profile_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_photos int;
begin
  if v_profile.status <> 'onboarding' then
    return v_profile.status;
  end if;
  select count(*) into v_photos
  from public.profile_photos ph where ph.user_id = v_profile.id and ph.status = 'approved';

  if v_profile.city_id is null then perform private.fail('Pick your city first.', 'INCOMPLETE'); end if;
  if char_length(v_profile.first_name) < 2 then perform private.fail('Add your first name.', 'INCOMPLETE'); end if;
  if v_profile.declared_gender is null then perform private.fail('Pick your gender.', 'INCOMPLETE'); end if;
  if v_profile.area_name = '' then perform private.fail('Pick your area.', 'INCOMPLETE'); end if;
  if v_photos < 2 then perform private.fail('Add at least 2 approved photos.', 'INCOMPLETE'); end if;
  if cardinality(v_profile.interests) < 2 then perform private.fail('Pick at least 2 interests.', 'INCOMPLETE'); end if;
  if v_profile.rules_accepted_at is null then perform private.fail('Accept the community rules.', 'INCOMPLETE'); end if;

  update public.profiles set status = 'active' where id = v_profile.id;
  return 'active';
end;
$$;

-- Returns the storage path so the client can remove the stored files.
create function public.delete_profile_photo(p_photo_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_photo public.profile_photos;
  v_remaining int;
begin
  select * into v_photo from public.profile_photos where id = p_photo_id and user_id = v_profile.id;
  if v_photo.id is null then
    perform private.fail('Photo not found.', 'NOT_FOUND');
  end if;

  select count(*) into v_remaining
  from public.profile_photos ph
  where ph.user_id = v_profile.id and ph.status = 'approved' and ph.id <> p_photo_id;
  if v_profile.status = 'active' and v_photo.status = 'approved' and v_remaining < 2 then
    perform private.fail('Keep at least 2 approved photos. Add another before removing this one.', 'MIN_PHOTOS');
  end if;

  delete from public.profile_photos where id = p_photo_id;
  return array_remove(array[v_photo.path, v_photo.quarantine_path], null);
end;
$$;

-- -----------------------------------------------------------------------------
-- Plans (PL-1, SF-6, S-26, S-31 to S-34)
-- -----------------------------------------------------------------------------
create function public.create_plan(
  p_venue_id uuid,
  p_title text,
  p_description text,
  p_activity text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity smallint,
  p_audience public.plan_audience,
  p_requires_approval boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_venue public.venues;
  v_count int;
  v_plan_id uuid;
begin
  if v_profile.status <> 'active' or v_profile.verification_status <> 'verified' then
    perform private.fail('Verify your account to host a plan.', 'VERIFY_REQUIRED');
  end if;
  if p_audience = 'women_only' and v_profile.verified_gender is distinct from 'woman' then
    perform private.fail('Only verified women can host women-only plans.', 'AUDIENCE');
  end if;
  if p_audience = 'same_college' and v_profile.college_id is null then
    perform private.fail('Add your college to your profile to host a same-college plan.', 'AUDIENCE');
  end if;

  select * into v_venue from public.venues where id = p_venue_id;
  if v_venue.id is null or v_venue.status <> 'approved' or v_venue.city_id is distinct from v_profile.city_id then
    perform private.fail('Pick an approved public venue in your city.', 'VENUE');
  end if;
  if not exists (select 1 from public.activities a where a.slug = p_activity) then
    perform private.fail('Pick an activity.');
  end if;
  if p_capacity < 3 or p_capacity > 10 then
    perform private.fail('Group size must be 3 to 10.');
  end if;
  if p_starts_at < now() + make_interval(hours => private.setting_int('plan_min_lead_hours')) then
    perform private.fail('Plans must start at least 3 hours from now.', 'LEAD_TIME');
  end if;
  if p_ends_at <= p_starts_at + interval '29 minutes' or p_ends_at > p_starts_at + interval '6 hours' then
    perform private.fail('Plans last between 30 minutes and 6 hours.', 'DURATION');
  end if;
  if not v_venue.late_events_allowed and (
    (p_ends_at at time zone 'Asia/Kolkata')::time > private.setting('plan_cutoff_local')::time
    or (p_ends_at at time zone 'Asia/Kolkata')::date <> (p_starts_at at time zone 'Asia/Kolkata')::date
  ) then
    perform private.fail('Plans must end by 9:00 PM unless the venue is a late-evening partner.', 'CUTOFF');
  end if;

  if v_profile.entitlement = 'free' then
    v_count := private.bump_counter(v_profile.id, 'host_week', private.ist_week_start(p_starts_at));
    if v_count > private.setting_int('free_hosts_per_week') then
      perform private.fail('The free tier includes 1 hosted plan a week.', 'CAP_REACHED');
    end if;
  end if;

  insert into public.plans (
    city_id, host_id, venue_id, title, description, activity, starts_at, ends_at,
    capacity, audience, college_id, requires_approval
  ) values (
    v_profile.city_id, v_profile.id, p_venue_id, btrim(p_title), nullif(btrim(p_description), ''),
    p_activity, p_starts_at, p_ends_at, p_capacity, p_audience,
    case when p_audience = 'same_college' then v_profile.college_id end, p_requires_approval
  )
  returning id into v_plan_id;

  insert into public.plan_members (plan_id, user_id, status, decided_at)
  values (v_plan_id, v_profile.id, 'approved', now());

  insert into public.conversations (kind, plan_id, closes_at)
  values ('plan', v_plan_id, p_ends_at + make_interval(hours => private.setting_int('chat_close_hours')));

  return v_plan_id;
end;
$$;

-- Host may edit title and description while the plan is open.
create function public.update_plan_text(p_plan_id uuid, p_title text, p_description text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
begin
  update public.plans
  set title = btrim(p_title), description = nullif(btrim(p_description), '')
  where id = p_plan_id and host_id = v_profile.id and status in ('open', 'full');
  if not found then
    perform private.fail('Only the host can edit an upcoming plan.', 'FORBIDDEN');
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Joining (PL-3, PL-4, ON-4, ON-5, SB-1, SF-5)
-- -----------------------------------------------------------------------------
create function public.request_join(p_plan_id uuid, p_note text default null)
returns public.member_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_plan public.plans;
  v_existing public.member_status;
  v_day int;
  v_week int;
  v_status public.member_status;
begin
  if v_profile.status <> 'active' or v_profile.verification_status <> 'verified' then
    perform private.fail('Verify your account to join plans.', 'VERIFY_REQUIRED');
  end if;
  if v_profile.rules_accepted_at is null then
    perform private.fail('Accept the community rules before your first join.', 'RULES_REQUIRED');
  end if;
  if not app.can_see_plan(v_profile.id, p_plan_id) then
    perform private.fail('Plan not found.', 'NOT_FOUND');
  end if;

  select * into v_plan from public.plans where id = p_plan_id for update;
  if v_plan.host_id = v_profile.id then
    perform private.fail('You are hosting this plan.', 'HOST');
  end if;
  if v_plan.status <> 'open' then
    perform private.fail('This plan is no longer taking requests.', 'CLOSED');
  end if;

  select pm.status into v_existing from public.plan_members pm
  where pm.plan_id = p_plan_id and pm.user_id = v_profile.id;
  if v_existing in ('requested', 'approved') then
    return v_existing;
  end if;
  if v_existing in ('declined', 'removed', 'expired') then
    perform private.fail('This plan couldn''t take you this time.', 'CLOSED');
  end if;

  -- S-27 / S-28 daily limits.
  v_day := private.bump_counter(v_profile.id, 'join_day', private.ist_today());
  if v_profile.created_at >= now() - make_interval(days => private.setting_int('new_account_days'))
     and v_day > private.setting_int('new_join_per_day') then
    perform private.fail('New accounts can send 5 join requests a day during their first week.', 'CAP_REACHED');
  elsif v_day > private.setting_int('max_join_per_day') then
    perform private.fail('You''ve reached today''s join request limit.', 'CAP_REACHED');
  end if;

  -- S-25 weekly free-tier joins, counted in the week of the plan.
  if v_profile.entitlement = 'free' then
    v_week := private.bump_counter(v_profile.id, 'join_week', private.ist_week_start(v_plan.starts_at));
    if v_week > private.setting_int('free_joins_per_week') then
      perform private.fail('The free tier includes 2 plan joins a week.', 'CAP_REACHED');
    end if;
  end if;

  v_status := case
    when not v_plan.requires_approval and v_plan.approved_count < v_plan.capacity then 'approved'
    else 'requested'
  end;

  insert into public.plan_members (plan_id, user_id, status, requested_at, decided_at, note)
  values (p_plan_id, v_profile.id, v_status, now(),
          case when v_status = 'approved' then now() end, nullif(btrim(p_note), ''))
  on conflict (plan_id, user_id) do update
  set status = excluded.status, requested_at = excluded.requested_at,
      decided_at = excluded.decided_at, note = excluded.note, checked_in_at = null;

  return v_status;
end;
$$;

-- Returns a weekly join slot for a request that never became an attendance (S-25).
create function private.return_join_slot(p_user uuid, p_plan_starts_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.bump_counter(p_user, 'join_week', private.ist_week_start(p_plan_starts_at), -1);
$$;

create function public.decide_join(p_plan_id uuid, p_user_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan_id for update;
  if v_plan.id is null or v_plan.host_id <> v_profile.id then
    perform private.fail('Only the host can review requests.', 'FORBIDDEN');
  end if;
  if v_plan.status not in ('open', 'full') then
    perform private.fail('This plan is no longer taking requests.', 'CLOSED');
  end if;
  if p_approve and v_plan.approved_count >= v_plan.capacity then
    perform private.fail('This plan is full.', 'FULL');
  end if;

  update public.plan_members
  set status = case when p_approve then 'approved' else 'declined' end::public.member_status,
      decided_at = now()
  where plan_id = p_plan_id and user_id = p_user_id and status = 'requested';
  if not found then
    perform private.fail('This request is no longer pending.', 'NOT_FOUND');
  end if;

  if not p_approve then
    perform private.return_join_slot(p_user_id, v_plan.starts_at);
  end if;
end;
$$;

-- Withdraw a request or leave an approved plan. Never gated (S-30).
create function public.leave_plan(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_plan public.plans;
  v_status public.member_status;
begin
  select * into v_plan from public.plans where id = p_plan_id for update;
  if v_plan.host_id = v_uid then
    perform private.fail('Hosts cancel the plan instead of leaving.', 'HOST');
  end if;
  select pm.status into v_status from public.plan_members pm
  where pm.plan_id = p_plan_id and pm.user_id = v_uid;

  if v_status = 'requested' then
    update public.plan_members set status = 'withdrawn', decided_at = now()
    where plan_id = p_plan_id and user_id = v_uid;
    perform private.return_join_slot(v_uid, v_plan.starts_at);
  elsif v_status = 'approved' then
    update public.plan_members set status = 'left', decided_at = now()
    where plan_id = p_plan_id and user_id = v_uid;
  else
    perform private.fail('You are not in this plan.', 'NOT_FOUND');
  end if;
end;
$$;

-- PL-5: host cancel. Within 3 hours of start it is a late cancel.
create function private.cancel_plan_internal(p_plan_id uuid, p_reason text, p_by_admin boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
  v_late boolean;
  m record;
begin
  select * into v_plan from public.plans where id = p_plan_id for update;
  if v_plan.status not in ('open', 'full') then
    perform private.fail('Only upcoming plans can be cancelled.', 'CLOSED');
  end if;
  v_late := v_plan.starts_at <= now() + make_interval(hours => private.setting_int('late_cancel_hours'));

  update public.plans
  set status = 'cancelled', cancel_reason = btrim(p_reason), cancelled_at = now(),
      late_cancel = v_late and not p_by_admin
  where id = p_plan_id;

  for m in
    select pm.user_id, pm.status from public.plan_members pm
    where pm.plan_id = p_plan_id and pm.user_id <> v_plan.host_id and pm.status in ('requested', 'approved')
  loop
    perform private.return_join_slot(m.user_id, v_plan.starts_at);
    if m.status = 'approved' then
      perform private.notify(m.user_id, 'plan', 'plan_cancelled', 'Plan cancelled',
        v_plan.title || ' was cancelled: ' || btrim(p_reason), p_plan_id);
    end if;
  end loop;
  update public.plan_members set status = 'expired'
  where plan_id = p_plan_id and status = 'requested';

  if not p_by_admin then
    if v_late then
      update public.profile_stats set late_cancel_count_30d = late_cancel_count_30d + 1
      where user_id = v_plan.host_id;
    else
      perform private.bump_counter(v_plan.host_id, 'host_week', private.ist_week_start(v_plan.starts_at), -1);
    end if;
  end if;
  return v_late;
end;
$$;

create function public.cancel_plan(p_plan_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    perform private.fail('Tell members why the plan is cancelled.');
  end if;
  if not exists (select 1 from public.plans where id = p_plan_id and host_id = v_profile.id) then
    perform private.fail('Only the host can cancel this plan.', 'FORBIDDEN');
  end if;
  return private.cancel_plan_internal(p_plan_id, p_reason, false);
end;
$$;

-- -----------------------------------------------------------------------------
-- Chat helpers
-- -----------------------------------------------------------------------------
-- Sender may remove their own message within 2 minutes (soft delete).
create function public.delete_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.messages set status = 'rejected'
  where id = p_message_id and sender_id = private.require_uid() and created_at >= now() - interval '2 minutes';
  if not found then
    perform private.fail('Messages can only be removed within 2 minutes.', 'FORBIDDEN');
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Safety (CH-4, VR-5, SF-3, S-17, S-28, S-30)
-- -----------------------------------------------------------------------------
create function public.submit_report(
  p_target_user_id uuid,
  p_reason public.report_reason,
  p_details text default '',
  p_plan_id uuid default null,
  p_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_severity public.report_severity;
  v_report_id uuid;
  v_conv_id uuid;
  v_reporters int;
  v_counts boolean;
begin
  if v_uid = p_target_user_id or not exists (select 1 from public.profiles where id = p_target_user_id) then
    perform private.fail('You can''t report this account.');
  end if;
  if private.bump_counter(v_uid, 'report_day', private.ist_today()) > private.setting_int('max_reports_per_day') then
    perform private.fail('You''ve reached today''s report limit. For emergencies call 112.', 'CAP_REACHED');
  end if;

  v_severity := case
    when p_reason in ('sexual_content', 'threat_or_violence', 'underage', 'unsafe_at_plan') then 'severe'
    else 'standard'
  end;

  insert into public.reports (reporter_id, target_user_id, plan_id, message_id, reason, severity, details)
  values (v_uid, p_target_user_id, p_plan_id, p_message_id, p_reason, v_severity, left(coalesce(p_details, ''), 1000))
  returning id into v_report_id;

  insert into public.moderation_queue (subject, subject_id, user_id, severity, due_at)
  values ('report', v_report_id, p_target_user_id, v_severity,
          now() + case when v_severity = 'severe' then interval '12 hours' else interval '24 hours' end);

  if v_severity = 'severe' then
    perform private.alert('severe_report', jsonb_build_object('report_id', v_report_id, 'reason', p_reason));
  end if;

  -- PRD §4: reported during a plan -> mute in that chat, keep the thread for 24 h.
  if p_plan_id is not null and app.is_plan_member(v_uid, p_plan_id) then
    select c.id into v_conv_id from public.conversations c where c.plan_id = p_plan_id;
    if v_conv_id is not null then
      insert into public.conversation_mutes (conversation_id, user_id, reason)
      values (v_conv_id, p_target_user_id, 'in_plan_report')
      on conflict do nothing;
      update public.conversations
      set hold_until = greatest(coalesce(hold_until, closes_at), closes_at, now() + interval '24 hours')
      where id = v_conv_id;
    end if;
  end if;

  -- VR-5: 2 distinct verified, active reporters in 30 days, not blocked by the target
  -- (prevents brigading by suspended alts), or one underage report.
  v_counts := p_reason = 'underage';
  if not v_counts then
    select count(distinct r.reporter_id) into v_reporters
    from public.reports r
    join public.profiles rp on rp.id = r.reporter_id
    where r.target_user_id = p_target_user_id
      and r.created_at >= now() - interval '30 days'
      and rp.status = 'active'
      and rp.verification_status = 'verified'
      and not exists (
        select 1 from public.blocks b where b.blocker_id = p_target_user_id and b.blocked_id = r.reporter_id
      );
    v_counts := v_reporters >= private.setting_int('auto_suspend_reports');
  end if;

  if v_counts then
    update public.profiles
    set status = 'suspended',
        status_reason = 'Your account is paused while we review reports. We''ll reply within 24 hours.'
    where id = p_target_user_id and status = 'active';
    if found then
      update public.plan_members pm set status = 'withdrawn'
      from public.plans pl
      where pm.plan_id = pl.id and pm.user_id = p_target_user_id
        and pm.status = 'requested' and pl.host_id <> p_target_user_id;
      update public.moderation_queue set status = 'escalated'
      where subject = 'report' and subject_id = v_report_id and p_reason = 'underage';
    end if;
  end if;

  return v_report_id;
end;
$$;

create function public.block_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  if v_uid = p_target_user_id then
    perform private.fail('You can''t block yourself.');
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_target_user_id)
  on conflict do nothing;

  -- S-17: the blocked person leaves upcoming plans the blocker hosts. They are not told.
  update public.plan_members pm set status = 'removed', decided_at = now()
  from public.plans pl
  where pm.plan_id = pl.id
    and pl.host_id = v_uid
    and pm.user_id = p_target_user_id
    and pl.status in ('open', 'full')
    and pm.status in ('requested', 'approved');
end;
$$;

-- SF-3: the server records only that SOS was used, never the location (S-51).
create function public.log_sos(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  if not app.is_plan_member(v_uid, p_plan_id) then
    return;
  end if;
  perform private.alert('sos_pressed', jsonb_build_object('plan_id', p_plan_id, 'user_id', v_uid));
end;
$$;

-- -----------------------------------------------------------------------------
-- Ratings (SF-4): attended members, completed plan, within 7 days
-- -----------------------------------------------------------------------------
create function public.submit_rating(p_plan_id uuid, p_ratings jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_plan public.plans;
  v_rows int;
begin
  select * into v_plan from public.plans where id = p_plan_id;
  if v_plan.status <> 'completed' or v_plan.ends_at < now() - interval '7 days' then
    perform private.fail('Ratings are open for 7 days after a plan ends.', 'CLOSED');
  end if;
  if not exists (
    select 1 from public.plan_members pm
    where pm.plan_id = p_plan_id and pm.user_id = v_uid and pm.status = 'attended'
  ) then
    perform private.fail('Only members who checked in can rate this plan.', 'FORBIDDEN');
  end if;

  insert into public.ratings (plan_id, rater_id, ratee_id, felt_safe, showed_up)
  select p_plan_id, v_uid, (r ->> 'ratee_id')::uuid, (r ->> 'felt_safe')::boolean,
    -- A "didn't show" for someone who checked in is not counted (moderation doc).
    (r ->> 'showed_up')::boolean or pm.checked_in_at is not null
  from jsonb_array_elements(p_ratings) r
  join public.plan_members pm
    on pm.plan_id = p_plan_id and pm.user_id = (r ->> 'ratee_id')::uuid
   and pm.status in ('attended', 'no_show')
  where (r ->> 'ratee_id')::uuid <> v_uid
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- -----------------------------------------------------------------------------
-- Appeals (VR-6): one open appeal per subject, answered within 48 h
-- -----------------------------------------------------------------------------
create function public.submit_appeal(p_subject public.appeal_subject, p_subject_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_id uuid;
begin
  if char_length(btrim(coalesce(p_message, ''))) not between 10 and 1000 then
    perform private.fail('Explain your appeal in 10 to 1000 characters.');
  end if;
  if exists (
    select 1 from public.appeals a
    where a.user_id = v_uid and a.subject = p_subject and a.subject_id = p_subject_id and a.status = 'open'
  ) then
    perform private.fail('You already have an open appeal for this.', 'DUPLICATE');
  end if;

  insert into public.appeals (user_id, subject, subject_id, message)
  values (v_uid, p_subject, p_subject_id, btrim(p_message))
  returning id into v_id;

  -- Appeal text is never auto-rejected; terms only flag it for the reviewer.
  insert into public.moderation_queue (subject, subject_id, user_id, severity, ai_labels, due_at)
  values ('appeal', v_id, v_uid, 'standard',
          case when private.screen_text(p_message) <> 'allow' then '["flagged_text"]'::jsonb else '[]'::jsonb end,
          now() + interval '48 hours');
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Notifications and caps
-- -----------------------------------------------------------------------------
create function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
$$;

create function public.my_caps()
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
    'joins_used', coalesce((select count from public.usage_counters
      where user_id = v_profile.id and kind = 'join_week' and period_start = v_week), 0),
    'joins_limit', private.setting_int('free_joins_per_week'),
    'hosts_used', coalesce((select count from public.usage_counters
      where user_id = v_profile.id and kind = 'host_week' and period_start = v_week), 0),
    'hosts_limit', private.setting_int('free_hosts_per_week')
  );
end;
$$;

grant execute on function
  public.select_city(uuid),
  public.save_profile(text, public.gender, text, text[], text[], text, text, uuid, boolean),
  public.accept_rules(text),
  public.complete_profile(),
  public.delete_profile_photo(uuid),
  public.create_plan(uuid, text, text, text, timestamptz, timestamptz, smallint, public.plan_audience, boolean),
  public.update_plan_text(uuid, text, text),
  public.request_join(uuid, text),
  public.decide_join(uuid, uuid, boolean),
  public.leave_plan(uuid),
  public.cancel_plan(uuid, text),
  public.delete_message(uuid),
  public.submit_report(uuid, public.report_reason, text, uuid, uuid),
  public.block_user(uuid),
  public.log_sos(uuid),
  public.submit_rating(uuid, jsonb),
  public.submit_appeal(public.appeal_subject, uuid, text),
  public.mark_notifications_read(uuid[]),
  public.my_caps()
to authenticated;
