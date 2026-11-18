-- Rename the product to Hengout in member-facing messages. Only the message text changes;
-- signatures, security settings and grants are untouched (create or replace keeps them).

-- Latest definition: 20261116000002_admin_authz_fixes.sql
create or replace function public.admin_set_user_status(p_user_id uuid, p_status public.profile_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Suspend needs a reviewer; ban and restore need an admin. A NULL status asks for the stricter check.
  v_admin uuid := private.require_admin(p_status is distinct from 'suspended');
  v_before public.profiles;
  pl record;
begin
  if p_status is null or p_status not in ('active', 'suspended', 'banned') then
    raise exception using errcode = 'P0001', message = 'Unsupported status.';
  end if;
  if p_user_id = v_admin then
    raise exception using errcode = '42501', message = 'You cannot change your own status.', hint = 'FORBIDDEN';
  end if;
  if exists (select 1 from private.admin_roles where user_id = p_user_id) and not app.is_full_admin() then
    raise exception using errcode = '42501', message = 'Only an admin can act on staff accounts.', hint = 'FORBIDDEN';
  end if;

  select * into v_before from public.profiles where id = p_user_id for update;
  if v_before.id is null then
    raise exception using errcode = 'P0001', message = 'User not found.';
  end if;
  if p_status = 'active' and (v_before.status not in ('suspended', 'banned') or v_before.verification_status = 'blocked_minor') then
    raise exception using errcode = 'P0001', message = 'This account cannot be restored here.', hint = 'UNAVAILABLE';
  end if;

  update public.profiles
  set status = p_status,
      status_reason = case when p_status = 'active' then null else btrim(p_reason) end
  where id = p_user_id;

  if p_status = 'banned' then
    for pl in select id from public.plans where host_id = p_user_id and status in ('open', 'full') loop
      perform private.cancel_plan_internal(pl.id, 'The host is no longer on Hengout.', true);
    end loop;
    update public.plan_members set status = 'removed', decided_at = now()
    where user_id = p_user_id and status in ('requested', 'approved');
    update private.identity_fingerprints set is_banned = true where user_id = p_user_id;
  end if;

  if p_status in ('suspended', 'banned') then
    perform private.revoke_sessions(p_user_id);
  end if;

  perform private.audit(v_admin, 'user_' || p_status::text, 'user', p_user_id, p_reason,
    jsonb_build_object('status', v_before.status), jsonb_build_object('status', p_status));
end;
$$;

-- Latest definition: 20261026000007_service.sql
create or replace function public.svc_kyc_apply(p_result jsonb)
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
          status = 'banned', status_reason = 'This ID cannot be used on Hengout.'
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
        status_reason = 'You must be 18 or older to use Hengout.'
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

-- Latest definition: 20261030000001_custom_area_college.sql
create or replace function public.save_profile(
  p_first_name text default null,
  p_declared_gender public.gender default null,
  p_bio text default null,
  p_interests text[] default null,
  p_languages text[] default null,
  p_area_name text default null,
  p_area_cell text default null,
  p_college_id uuid default null,
  p_clear_college boolean default false,
  p_age integer default null,
  p_college_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_year smallint;
  v_college uuid;
  v_college_name text := nullif(btrim(p_college_name), '');
  v_screen text;
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
  if p_area_name is not null and char_length(btrim(p_area_name)) not between 2 and 40 then
    perform private.fail('Area needs 2 to 40 characters.');
  end if;
  if p_area_name is not null then
    v_screen := private.screen_text(p_area_name);
    if v_screen like 'reject:%' then
      perform private.fail('That area name cannot be saved.');
    end if;
  end if;
  if p_area_cell is not null and p_area_cell !~ '^[0-9a-f]{15}$' then
    perform private.fail('Pick your area from the list.');
  end if;
  if v_college_name is not null then
    if char_length(v_college_name) > 80 then
      perform private.fail('College can be at most 80 characters.');
    end if;
    if char_length(v_college_name) < 2 then
      perform private.fail('College needs at least 2 characters.');
    end if;
    v_screen := private.screen_text(v_college_name);
    if v_screen like 'reject:%' then
      perform private.fail('That college name cannot be saved.');
    end if;
    if v_profile.city_id is null then
      perform private.fail('Pick your city first.');
    end if;
    select c.id into v_college
    from public.colleges c
    where c.city_id = v_profile.city_id
      and c.status = 'active'
      and lower(c.name) = lower(v_college_name)
    limit 1;
    if v_college is null then
      insert into public.colleges (city_id, name)
      values (v_profile.city_id, v_college_name)
      returning id into v_college;
    end if;
  elsif p_college_id is not null and not exists (
    select 1 from public.colleges c
    where c.id = p_college_id and c.status = 'active' and c.city_id = v_profile.city_id
  ) then
    perform private.fail('Pick a college from your city.');
  end if;
  if p_declared_gender is not null and v_profile.declared_gender is not null
     and p_declared_gender <> v_profile.declared_gender then
    perform private.fail('Gender can only be changed through support.', 'GENDER_LOCKED');
  end if;
  if p_age is not null and p_age not between 18 and 99 then
    perform private.fail('Hengout is for members 18 and older. Enter an age between 18 and 99.');
  end if;

  if p_age is not null and v_profile.verification_status <> 'verified' then
    v_year := (extract(year from now())::int - p_age)::smallint;
  end if;

  update public.profiles set
    first_name = coalesce(btrim(p_first_name), first_name),
    declared_gender = coalesce(declared_gender, p_declared_gender),
    bio = case when p_bio is null then bio else nullif(btrim(p_bio), '') end,
    interests = coalesce(p_interests, interests),
    languages = coalesce(p_languages, languages),
    area_name = coalesce(nullif(btrim(p_area_name), ''), area_name),
    area_cell = coalesce(p_area_cell, area_cell),
    college_id = case
      when v_college_name is not null then v_college
      when p_clear_college then null
      else coalesce(p_college_id, college_id)
    end,
    birth_year = coalesce(v_year, birth_year)
  where id = v_profile.id;
end;
$$;
