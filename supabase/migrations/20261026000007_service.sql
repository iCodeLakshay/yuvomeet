-- Service functions called by Edge Functions with the service role key.
-- They live in public so PostgREST can reach them, but only service_role may execute.

-- -----------------------------------------------------------------------------
-- OTP lockout (S-8, S-10): keyed by HMAC of the phone number, never the number
-- -----------------------------------------------------------------------------
create function public.svc_otp_locked_until(p_phone_hmac text)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select o.locked_until from private.otp_attempts o
  where o.phone_hmac = p_phone_hmac and o.locked_until > now();
$$;

create function public.svc_otp_record(p_phone_hmac text, p_success boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max int := private.setting_int('otp_lock_max_fails');
  v_row private.otp_attempts;
begin
  if p_success then
    delete from private.otp_attempts where phone_hmac = p_phone_hmac;
    return jsonb_build_object('remaining', v_max, 'locked_until', null);
  end if;

  insert into private.otp_attempts as o (phone_hmac, failed_count)
  values (p_phone_hmac, 1)
  on conflict (phone_hmac) do update
  set failed_count = case when o.locked_until is not null and o.locked_until <= now() then 1 else o.failed_count + 1 end,
      locked_until = case when o.locked_until is not null and o.locked_until <= now() then null else o.locked_until end,
      updated_at = now()
  returning * into v_row;

  if v_row.failed_count >= v_max then
    update private.otp_attempts
    set locked_until = now() + make_interval(mins => private.setting_int('otp_lock_minutes'))
    where phone_hmac = p_phone_hmac
    returning * into v_row;
  end if;
  return jsonb_build_object('remaining', greatest(v_max - v_row.failed_count, 0), 'locked_until', v_row.locked_until);
end;
$$;

-- -----------------------------------------------------------------------------
-- Rate limits and cost guard
-- -----------------------------------------------------------------------------
create function public.svc_rate_hit(p_user uuid, p_endpoint text, p_window_seconds int, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into private.edge_rate as er (user_id, endpoint, window_start, count)
  values (p_user, p_endpoint, v_window, 1)
  on conflict (user_id, endpoint, window_start) do update set count = er.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

create function public.svc_vendor_usage(p_vendor text, p_units int default 1)
returns int
language sql
security definer
set search_path = ''
as $$
  insert into private.vendor_usage as vu (vendor, day, units)
  values (p_vendor, private.ist_today(), p_units)
  on conflict (vendor, day) do update set units = vu.units + excluded.units
  returning units;
$$;

-- -----------------------------------------------------------------------------
-- Verification (VR-1 to VR-3, S-38 to S-41)
-- -----------------------------------------------------------------------------
-- Decides whether a new paid KYC session may start. Returns {action, attempt, photo_path}.
create function public.svc_kyc_prepare(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_attempts int;
  v_allowed int;
  v_photo text;
begin
  select * into v_profile from public.profiles where id = p_user;
  if v_profile.status <> 'active' then
    return jsonb_build_object('action', 'denied', 'message', 'Finish your profile before verifying.');
  end if;
  if v_profile.verification_status = 'verified' then
    return jsonb_build_object('action', 'already_verified');
  end if;
  if v_profile.verification_status in ('manual_review', 'blocked_minor') then
    return jsonb_build_object('action', v_profile.verification_status::text);
  end if;

  select count(*) into v_attempts from private.kyc_sessions where user_id = p_user;
  v_allowed := 2 + coalesce((select granted from private.kyc_extra_attempts where user_id = p_user), 0);
  if v_attempts >= v_allowed then
    -- VR-2: after the retry, a person checks by hand instead of another paid check.
    update public.profiles set verification_status = 'manual_review' where id = p_user;
    if not exists (
      select 1 from public.moderation_queue
      where subject = 'verification' and subject_id = p_user and status in ('pending', 'in_review', 'escalated')
    ) then
      insert into public.moderation_queue (subject, subject_id, user_id, due_at)
      values ('verification', p_user, p_user, now() + interval '24 hours');
    end if;
    return jsonb_build_object('action', 'manual_review');
  end if;

  if (select coalesce(sum(units), 0) from private.vendor_usage
      where vendor = 'hyperverge' and day = private.ist_today()) >= private.setting_int('kyc_daily_cap') then
    perform private.alert('kyc_circuit_breaker', jsonb_build_object('day', private.ist_today()));
    return jsonb_build_object('action', 'busy', 'message', 'Verification is busy, try again in a few hours.');
  end if;

  select ph.path into v_photo from public.profile_photos ph
  where ph.user_id = p_user and ph.status = 'approved' and ph.path is not null
  order by ph.position limit 1;
  if v_photo is null then
    return jsonb_build_object('action', 'denied', 'message', 'Add an approved profile photo first.');
  end if;

  return jsonb_build_object('action', 'start', 'attempt', v_attempts + 1, 'photo_path', v_photo);
end;
$$;

create function public.svc_kyc_register(p_user uuid, p_transaction_id text, p_attempt int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.kyc_sessions (transaction_id, user_id, attempt) values (p_transaction_id, p_user, p_attempt);
  update public.profiles set verification_status = 'pending' where id = p_user and verification_status <> 'verified';
  perform public.svc_vendor_usage('hyperverge', 1);
end;
$$;

-- Applies a normalised, PII-free provider result. Input keys:
--   transaction_id, fingerprint, birth_year, gender, face_score, liveness_score, id_readable
-- Returns {outcome: verified | review | retry | minor | duplicate}.
create function public.svc_kyc_apply(p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session private.kyc_sessions;
  v_profile public.profiles;
  v_fp private.identity_fingerprints;
  v_birth smallint := nullif(p_result ->> 'birth_year', '')::smallint;
  v_gender public.gender := nullif(p_result ->> 'gender', '')::public.gender;
  v_face numeric := coalesce((p_result ->> 'face_score')::numeric, 0);
  v_live numeric := coalesce((p_result ->> 'liveness_score')::numeric, 0);
  v_pass numeric := private.setting('kyc_face_pass')::numeric;
  v_review numeric := private.setting('kyc_face_review')::numeric;
  v_age int;
  v_face_verdict public.verdict;
  v_gender_verdict public.verdict;
  v_id_verdict public.verdict;
  v_outcome text;
  v_ref text := p_result ->> 'transaction_id';
begin
  select * into v_session from private.kyc_sessions where transaction_id = v_ref for update;
  if v_session.transaction_id is null then
    raise exception 'Unknown KYC transaction';
  end if;
  if v_session.completed_at is not null then
    return jsonb_build_object('outcome', 'duplicate_event');
  end if;
  update private.kyc_sessions set completed_at = now() where transaction_id = v_ref;
  select * into v_profile from public.profiles where id = v_session.user_id for update;

  -- S-39: one ID backs one account; a banned or minor ID never returns.
  if p_result ->> 'fingerprint' is not null then
    select * into v_fp from private.identity_fingerprints where fingerprint = p_result ->> 'fingerprint';
    if v_fp.fingerprint is not null and (v_fp.is_minor or v_fp.is_banned) then
      update public.profiles
      set verification_status = case when v_fp.is_minor then 'blocked_minor' else 'rejected' end::public.verification_status,
          status = 'banned', status_reason = 'This ID cannot be used on Yuvomeet.'
      where id = v_profile.id;
      perform private.revoke_sessions(v_profile.id);
      return jsonb_build_object('outcome', 'minor', 'user_id', v_profile.id);
    elsif v_fp.fingerprint is not null and v_fp.user_id is distinct from v_profile.id then
      update public.profiles set verification_status = 'rejected' where id = v_profile.id;
      insert into public.verification_checks (user_id, type, provider_ref, verdict, evidence, decided_at, attempt)
      values (v_profile.id, 'id_age', v_ref, 'fail', '{"reason":"id_already_used"}', now(), v_session.attempt);
      return jsonb_build_object('outcome', 'duplicate', 'user_id', v_profile.id);
    end if;
  end if;

  v_age := extract(year from now())::int - coalesce(v_birth, 0);
  if v_birth is not null and v_age < 18 then
    v_id_verdict := 'minor';
  elsif v_birth is null or coalesce((p_result ->> 'id_readable')::boolean, true) = false then
    v_id_verdict := 'review';
  else
    v_id_verdict := 'pass';
  end if;

  v_face_verdict := case
    when v_face >= v_pass and v_live >= v_pass then 'pass'
    when v_face >= v_review and v_live >= v_review then 'review'
    when v_session.attempt >= 2 then 'review'
    else 'fail'
  end;
  -- VR-3: a mismatch with declared gender goes to a person.
  v_gender_verdict := case
    when v_gender is null then 'review'
    when v_gender = v_profile.declared_gender then 'pass'
    else 'review'
  end;

  insert into public.verification_checks (user_id, type, provider_ref, ai_score, verdict, evidence, decided_at, attempt)
  values
    (v_profile.id, 'id_age', v_ref, null, v_id_verdict, '{}', now(), v_session.attempt),
    (v_profile.id, 'liveness_face', v_ref, v_face, v_face_verdict,
      jsonb_build_object('face_score', v_face, 'liveness_score', v_live), now(), v_session.attempt),
    (v_profile.id, 'gender', v_ref, null, v_gender_verdict,
      jsonb_build_object('gender', v_gender), now(), v_session.attempt);

  if p_result ->> 'fingerprint' is not null then
    insert into private.identity_fingerprints (fingerprint, user_id, is_minor, is_banned)
    values (p_result ->> 'fingerprint', v_profile.id, v_id_verdict = 'minor', v_id_verdict = 'minor')
    on conflict (fingerprint) do update set is_minor = excluded.is_minor or private.identity_fingerprints.is_minor,
      is_banned = excluded.is_banned or private.identity_fingerprints.is_banned;
  end if;

  if v_id_verdict = 'minor' then
    -- S-40: banned permanently; purge scheduled except fingerprint and ban record.
    update public.profiles
    set verification_status = 'blocked_minor', status = 'banned', birth_year = null,
        status_reason = 'You must be 18 or older to use Yuvomeet.'
    where id = v_profile.id;
    insert into private.deletion_jobs (user_id, purge_after)
    values (v_profile.id, now() + interval '7 days') on conflict do nothing;
    perform private.revoke_sessions(v_profile.id);
    v_outcome := 'minor';
  elsif v_id_verdict = 'pass' and v_face_verdict = 'pass' and v_gender_verdict = 'pass' then
    update public.profiles
    set verification_status = 'verified', verified_at = now(), birth_year = v_birth, verified_gender = v_gender
    where id = v_profile.id;
    v_outcome := 'verified';
  elsif v_face_verdict = 'fail' then
    update public.profiles set verification_status = 'unverified', birth_year = coalesce(v_birth, birth_year)
    where id = v_profile.id;
    v_outcome := 'retry';
  else
    update public.profiles set verification_status = 'manual_review', birth_year = coalesce(v_birth, birth_year)
    where id = v_profile.id;
    insert into public.moderation_queue (subject, subject_id, user_id, ai_verdict, ai_score, due_at)
    values ('verification', v_profile.id, v_profile.id, 'review', v_face, now() + interval '24 hours');
    v_outcome := 'review';
  end if;

  return jsonb_build_object('outcome', v_outcome, 'user_id', v_profile.id, 'attempt', v_session.attempt);
end;
$$;

-- -----------------------------------------------------------------------------
-- Media moderation (S-21 to S-24)
-- -----------------------------------------------------------------------------
create function public.svc_media_cache(p_sha256 text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('verdict', m.verdict, 'labels', m.labels)
  from private.media_moderation m where m.sha256 = p_sha256;
$$;

-- Registers an upload before moderation. kind: profile | chat.
create function public.svc_register_upload(
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
  else
    raise exception 'Unknown upload kind';
  end if;
  return v_id;
end;
$$;

-- verdict: pass -> approved; review -> queue; fail -> rejected and queued for audit.
create function public.svc_apply_media(
  p_kind text, p_id uuid, p_verdict public.verdict, p_labels jsonb,
  p_score numeric, p_sha256 text, p_media_path text
)
returns public.media_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.media_status := case p_verdict when 'pass' then 'approved' when 'fail' then 'rejected' else 'pending' end;
  v_user uuid;
begin
  if p_sha256 is not null then
    insert into private.media_moderation (sha256, verdict, labels) values (p_sha256, p_verdict, coalesce(p_labels, '[]'))
    on conflict (sha256) do nothing;
  end if;

  if p_kind = 'profile' then
    update public.profile_photos
    set status = v_status, path = p_media_path, sha256 = p_sha256,
        reject_reason = case when v_status = 'rejected' then coalesce(p_labels ->> 0, 'Not approved') end
    where id = p_id
    returning user_id into v_user;
  else
    update public.messages
    set image_status = v_status, image_path = p_media_path,
        status = case v_status when 'approved' then 'visible' when 'rejected' then 'rejected' else 'held' end::public.content_status
    where id = p_id
    returning sender_id into v_user;
  end if;

  if p_verdict <> 'pass' then
    insert into public.moderation_queue (subject, subject_id, user_id, ai_verdict, ai_score, ai_labels, due_at)
    values ('photo', p_id, v_user, p_verdict, p_score, coalesce(p_labels, '[]'), now() + interval '24 hours');
  end if;
  return v_status;
end;
$$;

-- -----------------------------------------------------------------------------
-- Check-in (PL-6, S-36): coordinates stay in the Edge Function
-- -----------------------------------------------------------------------------
create function public.svc_check_in_context(p_user uuid, p_plan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'starts_at', pl.starts_at,
    'venue_lat', v.lat,
    'venue_lng', v.lng,
    'member_status', pm.status,
    'checked_in_at', pm.checked_in_at,
    'radius_m', private.setting_int('checkin_radius_m'),
    'window_min', private.setting_int('checkin_window_min'),
    'max_accuracy_m', private.setting_int('checkin_max_accuracy_m')
  )
  from public.plans pl
  join public.venues v on v.id = pl.venue_id
  left join public.plan_members pm on pm.plan_id = pl.id and pm.user_id = p_user
  where pl.id = p_plan_id;
$$;

create function public.svc_mark_checked_in(p_user uuid, p_plan_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_at timestamptz;
begin
  update public.plan_members pm
  set checked_in_at = coalesce(pm.checked_in_at, now())
  from public.plans pl
  where pm.plan_id = pl.id and pm.plan_id = p_plan_id and pm.user_id = p_user
    and pm.status = 'approved'
    and pl.status in ('open', 'full', 'started')
    and abs(extract(epoch from (now() - pl.starts_at))) <= private.setting_int('checkin_window_min') * 60
  returning pm.checked_in_at into v_at;
  if v_at is null then
    raise exception using errcode = 'P0001', message = 'Check-in is not open for you right now.', hint = 'CHECKIN_CLOSED';
  end if;
  return v_at;
end;
$$;

-- -----------------------------------------------------------------------------
-- Push tokens (S-49)
-- -----------------------------------------------------------------------------
create function public.svc_push_tokens(p_user_ids uuid[])
returns table (user_id uuid, token text)
language sql
stable
security definer
set search_path = ''
as $$
  select pt.user_id, pt.token from public.push_tokens pt where pt.user_id = any (p_user_ids);
$$;

create function public.svc_drop_push_tokens(p_tokens text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = any (p_tokens);
$$;

-- -----------------------------------------------------------------------------
-- Export and deletion (ON-6)
-- -----------------------------------------------------------------------------
create function public.svc_export_user(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'user_id', p.id,
    'profile', jsonb_build_object(
      'first_name', p.first_name, 'birth_year', p.birth_year, 'declared_gender', p.declared_gender,
      'verified_gender', p.verified_gender, 'bio', p.bio, 'interests', p.interests, 'languages', p.languages,
      'area_name', p.area_name, 'verification_status', p.verification_status, 'status', p.status,
      'created_at', p.created_at),
    'photos', coalesce((select jsonb_agg(jsonb_build_object('path', ph.path, 'status', ph.status, 'created_at', ph.created_at))
      from public.profile_photos ph where ph.user_id = p.id), '[]'),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('plan_id', pm.plan_id, 'title', pl.title,
      'starts_at', pl.starts_at, 'status', pm.status, 'checked_in_at', pm.checked_in_at, 'hosted', pl.host_id = p.id))
      from public.plan_members pm join public.plans pl on pl.id = pm.plan_id where pm.user_id = p.id), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('conversation_id', m.conversation_id, 'body', m.body,
      'created_at', m.created_at) order by m.created_at)
      from public.messages m where m.sender_id = p.id), '[]'),
    'reports_filed', coalesce((select jsonb_agg(jsonb_build_object('reason', r.reason, 'status', r.status, 'created_at', r.created_at))
      from public.reports r where r.reporter_id = p.id), '[]'),
    'consents', coalesce((select jsonb_agg(jsonb_build_object('purpose', c.purpose, 'granted', c.granted,
      'policy_version', c.policy_version, 'created_at', c.created_at) order by c.created_at)
      from public.consents c where c.user_id = p.id), '[]'),
    'verification', coalesce((select jsonb_agg(jsonb_build_object('type', vc.type, 'verdict', vc.verdict, 'decided_at', vc.decided_at))
      from public.verification_checks vc where vc.user_id = p.id), '[]')
  )
  from public.profiles p where p.id = p_user;
$$;

create function public.svc_record_export(p_user uuid, p_path text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.data_exports (user_id, path) values (p_user, p_path) returning id;
$$;

-- Immediate effects of a deletion request; the purge runs in retention_tick.
create function public.svc_request_deletion(p_user uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purge timestamptz := now() + interval '30 days';
  pl record;
  m record;
begin
  for pl in select id from public.plans where host_id = p_user and status in ('open', 'full') loop
    perform private.cancel_plan_internal(pl.id, 'The host closed their account.', true);
  end loop;
  for m in
    select pm.plan_id, pl.starts_at, pm.status from public.plan_members pm
    join public.plans pl on pl.id = pm.plan_id
    where pm.user_id = p_user and pm.status in ('requested', 'approved') and pl.status in ('open', 'full')
  loop
    update public.plan_members set status = 'withdrawn' where plan_id = m.plan_id and user_id = p_user;
  end loop;
  update public.profiles set status = 'deleted', deleted_at = now() where id = p_user;
  delete from public.push_tokens where user_id = p_user;
  perform private.revoke_sessions(p_user);
  insert into private.deletion_jobs (user_id, purge_after) values (p_user, v_purge)
  on conflict (user_id) do update set requested_at = now(), purge_after = least(private.deletion_jobs.purge_after, v_purge);
  return v_purge;
end;
$$;

revoke execute on function
  public.svc_otp_locked_until(text), public.svc_otp_record(text, boolean),
  public.svc_rate_hit(uuid, text, int, int), public.svc_vendor_usage(text, int),
  public.svc_kyc_prepare(uuid), public.svc_kyc_register(uuid, text, int), public.svc_kyc_apply(jsonb),
  public.svc_media_cache(text), public.svc_register_upload(uuid, text, text, int, uuid, uuid),
  public.svc_apply_media(text, uuid, public.verdict, jsonb, numeric, text, text),
  public.svc_check_in_context(uuid, uuid), public.svc_mark_checked_in(uuid, uuid),
  public.svc_push_tokens(uuid[]), public.svc_drop_push_tokens(text[]),
  public.svc_export_user(uuid), public.svc_record_export(uuid, text), public.svc_request_deletion(uuid)
from public, anon, authenticated;

grant execute on function
  public.svc_otp_locked_until(text), public.svc_otp_record(text, boolean),
  public.svc_rate_hit(uuid, text, int, int), public.svc_vendor_usage(text, int),
  public.svc_kyc_prepare(uuid), public.svc_kyc_register(uuid, text, int), public.svc_kyc_apply(jsonb),
  public.svc_media_cache(text), public.svc_register_upload(uuid, text, text, int, uuid, uuid),
  public.svc_apply_media(text, uuid, public.verdict, jsonb, numeric, text, text),
  public.svc_check_in_context(uuid, uuid), public.svc_mark_checked_in(uuid, uuid),
  public.svc_push_tokens(uuid[]), public.svc_drop_push_tokens(text[]),
  public.svc_export_user(uuid), public.svc_record_export(uuid, text), public.svc_request_deletion(uuid)
to service_role;
