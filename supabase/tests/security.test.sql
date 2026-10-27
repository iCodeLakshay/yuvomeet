-- pgTAP suite for the security.md review checklist. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(79);

-- -----------------------------------------------------------------------------
-- Test helpers (rolled back with the transaction)
-- -----------------------------------------------------------------------------
create schema tests;

create function tests.login(p_user uuid, p_extra jsonb default '{}')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    (jsonb_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal1') || p_extra)::text, true);
  execute 'set local role authenticated';
end;
$$;

create function tests.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Active Kota member. Verified members have a verified gender; photos are approved.
create function tests.member(
  p_name text, p_gender public.gender, p_verified boolean default true,
  p_college uuid default null, p_age_days int default 30
) returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id) values (v_id);
  update public.profiles set
    first_name = p_name, declared_gender = p_gender, city_id = '11111111-1111-4111-8111-111111111101',
    status = 'active', rules_accepted_at = now(), interests = '{chai-cafe,music}',
    area_name = 'Talwandi', area_cell = '883d8b4491fffff', birth_year = 2003, college_id = p_college,
    verification_status = case when p_verified then 'verified' else 'unverified' end::public.verification_status,
    verified_gender = case when p_verified then p_gender end,
    created_at = now() - make_interval(days => p_age_days)
  where id = v_id;
  insert into public.profile_photos (user_id, quarantine_path, path, position, status) values
    (v_id, v_id || '/a.jpg', 'profiles/' || v_id || '/a.jpg', 0, 'approved'),
    (v_id, v_id || '/b.jpg', 'profiles/' || v_id || '/b.jpg', 1, 'approved');
  return v_id;
end;
$$;

-- Creates a plan directly (bypassing lead-time rules) for visibility tests.
create function tests.plan(p_host uuid, p_audience public.plan_audience default 'everyone',
  p_college uuid default null, p_starts timestamptz default now() + interval '1 day')
returns uuid language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.plans (city_id, host_id, venue_id, title, activity, starts_at, ends_at, capacity, audience, college_id)
  values ('11111111-1111-4111-8111-111111111101', p_host, '33333333-3333-4333-8333-333333333303',
    'Test plan', 'chai-cafe', p_starts, p_starts + interval '2 hours', 6, p_audience, p_college)
  returning id into v_id;
  insert into public.plan_members (plan_id, user_id, status, decided_at) values (v_id, p_host, 'approved', now());
  insert into public.conversations (plan_id, closes_at) values (v_id, p_starts + interval '26 hours');
  return v_id;
end;
$$;

grant usage on schema tests to authenticated;

-- A plan start time in IST that is safely inside the 21:00 cut-off.
create function tests.ist(p_days int, p_time text) returns timestamptz language sql as $$
  select ((now() at time zone 'Asia/Kolkata')::date + p_days + p_time::time) at time zone 'Asia/Kolkata';
$$;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
insert into ids values
  ('woman', tests.member('Riya', 'woman')),
  ('woman2', tests.member('Neha', 'woman')),
  ('man', tests.member('Aman', 'man')),
  ('unverified_woman', tests.member('Priya', 'woman', false)),
  ('college_a', tests.member('Ira', 'woman', true, '22222222-2222-4222-8222-222222222201')),
  ('college_b', tests.member('Dev', 'man', true, '22222222-2222-4222-8222-222222222202')),
  ('newbie', tests.member('Kabir', 'man', true, null, 2));
insert into ids values
  ('women_plan', tests.plan((select v from ids where k = 'woman'), 'women_only')),
  ('open_plan', tests.plan((select v from ids where k = 'woman'))),
  ('college_plan', tests.plan((select v from ids where k = 'college_a'), 'same_college', '22222222-2222-4222-8222-222222222201'));

create function tests.id(p_key text) returns uuid language sql stable as $$ select v from ids where k = p_key $$;

-- -----------------------------------------------------------------------------
-- S-1, S-5: structure
-- -----------------------------------------------------------------------------
select is((select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0,
  'S-1: every public table has RLS enabled');
select is((select count(*)::int from information_schema.columns
  where table_schema in ('public', 'private', 'app') and column_name ~* '(phone|mobile|msisdn)'
    and column_name <> 'phone_hmac'), 0,
  'S-5: no phone column outside auth (the OTP lock key is an HMAC, S-8)');
select ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anon cannot read profiles');
select ok(not has_function_privilege('authenticated', 'public.svc_kyc_apply(jsonb)', 'execute'),
  'service functions are not executable by clients');
select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'S-3: private schema is closed to clients');

-- -----------------------------------------------------------------------------
-- S-15, S-16: audience rules
-- -----------------------------------------------------------------------------
select tests.login(tests.id('man'));
select is((select count(*)::int from public.plans where id = tests.id('women_plan')), 0,
  'S-15: a man gets zero rows for a women-only plan by id');
select is((select count(*)::int from public.plan_cards where id = tests.id('women_plan')), 0,
  'S-15: a man gets zero rows for a women-only plan in the feed view');
select is((select count(*)::int from public.plan_cards where id = tests.id('open_plan')), 1,
  'a man sees an everyone plan');
select tests.login(tests.id('unverified_woman'));
select is((select count(*)::int from public.plan_cards where id = tests.id('women_plan')), 0,
  'S-15: an unverified woman gets zero rows for a women-only plan');
select tests.login(tests.id('woman2'));
select is((select count(*)::int from public.plan_cards where id = tests.id('women_plan')), 1,
  'S-15: a verified woman sees the women-only plan');
select tests.login(tests.id('college_b'));
select is((select count(*)::int from public.plans where id = tests.id('college_plan')), 0,
  'S-16: other colleges cannot see a same-college plan');
select tests.login(tests.id('man'));
select throws_like($$ select public.request_join(tests.id('women_plan')) $$, 'Plan not found%',
  'S-15: joining a women-only plan by id says not found');

-- -----------------------------------------------------------------------------
-- S-18: other users only through public_profiles
-- -----------------------------------------------------------------------------
select is((select count(*)::int from public.profiles where id = tests.id('woman')), 0,
  'S-18: base profiles table returns no rows for another user');
select is((select count(*)::int from public.profiles where id = tests.id('man')), 1, 'own profile row is readable');
select is((select age_band from public.public_profiles where id = tests.id('woman')), '21–24',
  'public_profiles exposes age band');
select is((select count(*)::int from information_schema.columns where table_schema = 'public'
  and table_name = 'public_profiles' and column_name in ('birth_year', 'area_cell', 'declared_gender', 'verified_gender')), 0,
  'S-18: public_profiles has no birth year, area cell, or gender columns');
select is((select count(*)::int from public.profile_photos where user_id = tests.id('woman')), 0,
  'photo rows of others are not readable directly');
select is((select count(*)::int from public.my_verification), 0, 'own verification view works and hides evidence');

-- -----------------------------------------------------------------------------
-- S-35: clients cannot write privileged columns
-- -----------------------------------------------------------------------------
select throws_ok($$ update public.plans set status = 'cancelled' where id = tests.id('open_plan') $$,
  '42501', null, 'S-35: client update of plans.status fails');
select throws_ok($$ update public.profiles set verification_status = 'verified' where id = auth.uid() $$,
  '42501', null, 'S-35: client update of profiles.verification_status fails');
select throws_ok($$ insert into public.plan_members (plan_id, user_id, status) values (tests.id('open_plan'), auth.uid(), 'approved') $$,
  '42501', null, 'S-35: client cannot insert membership rows');

-- -----------------------------------------------------------------------------
-- S-17: blocks
-- -----------------------------------------------------------------------------
select tests.logout();
insert into ids values ('blocker', tests.member('Meera', 'woman')), ('blocked', tests.member('Rohan', 'man'));
insert into ids values ('blocker_plan', tests.plan(tests.id('blocker')));
insert into public.plan_members (plan_id, user_id, status, decided_at) values (tests.id('blocker_plan'), tests.id('blocked'), 'approved', now());
insert into public.messages (id, conversation_id, sender_id, body)
select gen_random_uuid(), c.id, tests.id('blocker'), 'See you at 7' from public.conversations c where c.plan_id = tests.id('blocker_plan');
select tests.login(tests.id('blocker'));
select lives_ok($$ select public.block_user(tests.id('blocked')) $$, 'block_user runs');
select tests.login(tests.id('blocked'));
select is((select count(*)::int from public.plan_cards where host_id = tests.id('blocker')), 0,
  'S-17: blocked user cannot see the blocker''s plans');
select is((select count(*)::int from public.public_profiles where id = tests.id('blocker')), 0,
  'S-17: blocked user cannot see the blocker''s profile');
select is((select count(*)::int from public.messages m join public.conversations c on c.id = m.conversation_id
  where c.plan_id = tests.id('blocker_plan')), 0, 'S-17: blocked user cannot read the blocker''s messages');
select tests.logout();
select is((select status::text from public.plan_members where plan_id = tests.id('blocker_plan') and user_id = tests.id('blocked')),
  'removed', 'S-17: blocked user is removed from the blocker''s upcoming plan');

-- -----------------------------------------------------------------------------
-- S-25, S-26, S-31, S-32: caps and plan rules
-- -----------------------------------------------------------------------------
insert into ids values
  ('p1', tests.plan(tests.id('woman2'))), ('p2', tests.plan(tests.id('woman2'))), ('p3', tests.plan(tests.id('woman2')));
select tests.login(tests.id('man'));
select is(public.request_join(tests.id('p1'))::text, 'requested', 'first join request is accepted');
select is(public.request_join(tests.id('p2'))::text, 'requested', 'second join request is accepted');
select throws_like($$ select public.request_join(tests.id('p3')) $$, '%2 plan joins a week%',
  'S-25: third join request in a week fails for a free user');
select tests.login(tests.id('woman2'));
select lives_ok($$ select public.decide_join(tests.id('p1'), tests.id('man'), false) $$, 'host declines quietly');
select tests.login(tests.id('man'));
select is(public.request_join(tests.id('p3'))::text, 'requested', 'S-25: a declined request returns the slot');
select throws_like($$ select public.request_join(tests.id('p1')) $$, '%couldn''t take you%',
  'a declined member cannot re-request with a reason');

select tests.login(tests.id('woman'));
select throws_like(
  $$ select public.create_plan('33333333-3333-4333-8333-333333333304', 'Too soon', null, 'chai-cafe',
     now() + interval '2 hours 59 minutes', now() + interval '3 hours 59 minutes', 6::smallint, 'everyone') $$,
  '%at least 3 hours%', 'S-31: a plan starting in 2 h 59 m fails');
select throws_like(
  $$ select public.create_plan('33333333-3333-4333-8333-333333333304', 'Late chai', null, 'chai-cafe',
     tests.ist(2, '19:00'), tests.ist(2, '21:01'), 6::smallint, 'everyone') $$,
  '%by 9:00 PM%', 'S-32: ending at 21:01 fails at a standard venue');
select isnt(
  public.create_plan('33333333-3333-4333-8333-333333333303', 'Late jam', null, 'music-jam',
    tests.ist(2, '19:00'), tests.ist(2, '21:30'), 6::smallint, 'everyone'),
  null, 'S-32: ending at 21:30 is allowed at a late-evening partner venue');
select throws_like(
  $$ select public.create_plan('33333333-3333-4333-8333-333333333304', 'Second plan', null, 'chai-cafe',
     tests.ist(2, '17:00'), tests.ist(2, '18:00'), 6::smallint, 'everyone') $$,
  '%1 hosted plan a week%', 'S-26: a second hosted plan in the same week fails');
select tests.login(tests.id('man'));
select throws_like(
  $$ select public.create_plan('33333333-3333-4333-8333-333333333304', 'Girls only', null, 'chai-cafe',
     tests.ist(3, '17:00'), tests.ist(3, '18:00'), 6::smallint, 'women_only') $$,
  '%Only verified women%', 'S-34: a man cannot create a women-only plan');
select tests.login(tests.id('unverified_woman'));
select throws_like($$ select public.request_join(tests.id('open_plan')) $$, 'Verify your account%',
  'S-33: an unverified user cannot join');

-- -----------------------------------------------------------------------------
-- S-20: text screening
-- -----------------------------------------------------------------------------
select tests.logout();
select is(private.screen_text('Call me on 98 765 43210'), 'reject:phone_number', 'spaced phone number is rejected');
select is(private.screen_text('मेरा नंबर ९८७६५४३२१० है'), 'reject:phone_number', 'Devanagari digits are rejected');
select is(private.screen_text('nine eight seven six five four three two one zero'), 'reject:phone_number',
  'number words are rejected');
select is(private.screen_text('add me on insta'), 'reject:social_handle', 'platform names are rejected (word boundary works)');
select is(private.screen_text('installing the board game'), 'allow', 'words that merely contain "insta" are allowed');
select is(private.screen_text('looking for a hookup'), 'hold', 'flagged terms are held');
select is(private.screen_text('Chai at 6? Bringing Catan!'), 'allow', 'clean text is allowed');

-- -----------------------------------------------------------------------------
-- S-27, S-28: message caps
-- -----------------------------------------------------------------------------
select tests.logout();
insert into ids values ('chat_plan', tests.plan(tests.id('newbie')));
insert into ids select 'chat_conv', id from public.conversations where plan_id = tests.id('chat_plan');
insert into public.usage_counters (user_id, kind, period_start, count)
values (tests.id('newbie'), 'message_day', private.ist_today(), 20);
select tests.login(tests.id('newbie'));
select throws_like($$ insert into public.messages (id, conversation_id, sender_id, body)
  values (gen_random_uuid(), tests.id('chat_conv'), auth.uid(), 'hello') $$,
  'New accounts can send 20 messages%', 'S-27: the 21st message of the day fails for a new account');
select tests.logout();
update public.profiles set created_at = now() - interval '8 days' where id = tests.id('newbie');
select tests.login(tests.id('newbie'));
select lives_ok($$ insert into public.messages (id, conversation_id, sender_id, body)
  values (gen_random_uuid(), tests.id('chat_conv'), auth.uid(), 'hello again') $$,
  'S-27: the same message succeeds on day 8');
select throws_like($$ insert into public.messages (id, conversation_id, sender_id, body)
  values (gen_random_uuid(), tests.id('chat_conv'), auth.uid(), 'ping 9876543210') $$,
  'Phone numbers can''t be shared here.', 'CH-3: a phone number in chat is refused');

-- -----------------------------------------------------------------------------
-- S-46: audit log is insert-only for every role
-- -----------------------------------------------------------------------------
select tests.logout();
insert into public.audit_log (admin_id, action, subject_type, subject_id, reason)
values (tests.id('woman'), 'test', 'user', tests.id('man'), 'test');
select throws_ok($$ update public.audit_log set reason = 'x' $$, null, null, 'S-46: audit_log update fails for postgres');
select throws_ok($$ delete from public.audit_log $$, null, null, 'S-46: audit_log delete fails for postgres');
set local role service_role;
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'S-46: audit_log delete fails for service_role');
reset role;

-- -----------------------------------------------------------------------------
-- S-43, S-44: admin roles and MFA
-- -----------------------------------------------------------------------------
select tests.login(tests.id('woman2'), '{"app_role": "reviewer", "aal": "aal1"}');
select throws_ok($$ select public.admin_set_user_status(tests.id('man'), 'suspended', 'test') $$,
  '42501', null, 'S-44: a reviewer without aal2 is refused');
select tests.login(tests.id('woman2'), '{"app_role": "reviewer", "aal": "aal2"}');
select throws_ok($$ select public.admin_set_user_status(tests.id('man'), 'banned', 'abuse') $$,
  '42501', null, 'S-43: a reviewer cannot ban');
select lives_ok($$ select public.admin_set_user_status(tests.id('man'), 'suspended', 'abuse reports') $$,
  'a reviewer can suspend');
select tests.logout();
select is((select count(*)::int from public.audit_log where action = 'user_suspended' and subject_id = tests.id('man')), 1,
  'S-45: the suspension wrote an audit row');

-- -----------------------------------------------------------------------------
-- VR-5: two reports from distinct verified users suspend the target
-- -----------------------------------------------------------------------------
insert into ids values ('target', tests.member('Tanmay', 'man'));
select tests.login(tests.id('woman'));
select isnt(public.submit_report(tests.id('target'), 'harassment', 'rude'), null, 'first report is filed');
select tests.logout();
select is((select status::text from public.profiles where id = tests.id('target')), 'active', 'one report does not suspend');
select tests.login(tests.id('woman2'));
select isnt(public.submit_report(tests.id('target'), 'harassment', 'rude'), null, 'second report is filed');
select tests.logout();
select is((select status::text from public.profiles where id = tests.id('target')), 'suspended',
  'VR-5: the second report from a different verified user suspends the account');

-- -----------------------------------------------------------------------------
-- S-10: OTP lockout keyed by HMAC
-- -----------------------------------------------------------------------------
select is((select count(*)::int from (select public.svc_otp_record('hmac-1', false) from generate_series(1, 4)) fails), 4,
  'four wrong codes are recorded');
select is(public.svc_otp_locked_until('hmac-1'), null, 'four wrong codes do not lock');
select isnt((public.svc_otp_record('hmac-1', false) ->> 'locked_until'), null, 'S-10: the fifth wrong code locks the number');

-- -----------------------------------------------------------------------------
-- S-39, S-40: KYC results
-- -----------------------------------------------------------------------------
insert into ids values ('kyc_adult', tests.member('Sana', 'woman', false)), ('kyc_minor', tests.member('Tiny', 'man', false)),
  ('kyc_dup', tests.member('Copy', 'woman', false));
insert into private.kyc_sessions (transaction_id, user_id, attempt) values
  ('tx-adult', tests.id('kyc_adult'), 1), ('tx-minor', tests.id('kyc_minor'), 1), ('tx-dup', tests.id('kyc_dup'), 1);
select is(public.svc_kyc_apply('{"transaction_id":"tx-adult","fingerprint":"fp-adult","birth_year":2002,"gender":"woman","face_score":92,"liveness_score":95}') ->> 'outcome',
  'verified', 'a passing adult is verified');
select is(public.svc_kyc_apply(jsonb_build_object('transaction_id', 'tx-minor', 'fingerprint', 'fp-minor',
  'birth_year', extract(year from now())::int - 16, 'gender', 'man', 'face_score', 90, 'liveness_score', 90)) ->> 'outcome',
  'minor', 'S-40: an under-18 result is a minor outcome');
select is((select status::text from public.profiles where id = tests.id('kyc_minor')), 'banned', 'S-40: the minor is banned');
select is(public.svc_kyc_apply('{"transaction_id":"tx-dup","fingerprint":"fp-adult","birth_year":2002,"gender":"woman","face_score":92,"liveness_score":95}') ->> 'outcome',
  'duplicate', 'S-39: one ID cannot back a second account');

-- -----------------------------------------------------------------------------
-- PL-5, SF-4, notifications: lifecycle job, rating review, join notifications
-- -----------------------------------------------------------------------------
select tests.logout();
insert into ids values ('life_host', tests.member('Host', 'woman')), ('life_a', tests.member('Ana', 'woman')),
  ('life_b', tests.member('Bea', 'woman')), ('life_c', tests.member('Cy', 'man'));
insert into ids values ('life_plan', tests.plan(tests.id('life_host'), 'everyone', null, now() - interval '3 hours'));
update public.plans set ends_at = now() - interval '1 hour' where id = tests.id('life_plan');
insert into public.plan_members (plan_id, user_id, status, decided_at, checked_in_at) values
  (tests.id('life_plan'), tests.id('life_a'), 'approved', now(), now() - interval '3 hours'),
  (tests.id('life_plan'), tests.id('life_b'), 'approved', now(), now() - interval '3 hours'),
  (tests.id('life_plan'), tests.id('life_c'), 'approved', now(), null);
select private.plan_lifecycle_tick();
select private.plan_lifecycle_tick();
select is((select status::text from public.plans where id = tests.id('life_plan')), 'completed',
  'PL-5: the lifecycle job completes an ended plan');
select is((select status::text from public.plan_members where plan_id = tests.id('life_plan') and user_id = tests.id('life_c')),
  'no_show', 'a member without check-in becomes a no-show');
select is((select plans_attended from public.profile_stats where user_id = tests.id('life_a')), 1,
  'attendance is counted in profile stats');
select tests.login(tests.id('life_a'));
select is(public.submit_rating(tests.id('life_plan'),
  jsonb_build_array(jsonb_build_object('ratee_id', tests.id('life_c'), 'felt_safe', false, 'showed_up', false))), 1,
  'SF-4: an attended member can rate a co-member');
select tests.login(tests.id('life_b'));
select is(public.submit_rating(tests.id('life_plan'),
  jsonb_build_array(jsonb_build_object('ratee_id', tests.id('life_c'), 'felt_safe', false, 'showed_up', false))), 1,
  'a second member rates the same person');
select tests.logout();
select is((select count(*)::int from public.moderation_queue where subject = 'rating_review' and user_id = tests.id('life_c')
  and severity = 'severe'), 1, 'SF-4: two unsafe ratings create a severe review item');
select tests.login(tests.id('life_c'));
select is((select count(*)::int from public.ratings), 0, 'S-19: ratings are not readable by users');
select tests.logout();
select is((select count(*)::int from public.notifications where user_id = tests.id('man') and kind = 'join_declined'), 1,
  'a declined request sends the neutral notification');

-- -----------------------------------------------------------------------------
-- Server-side analytics outbox (S-9): allow-listed props, service role only
-- -----------------------------------------------------------------------------
select is((select (props->>'attended_count')::int from private.analytics_outbox
  where event = 'plan_completed' and props->>'plan_id' = tests.id('life_plan')::text), 3,
  'plan_completed is queued with the attended count (host included)');
insert into ids values ('an_plan', tests.plan(tests.id('life_host')));
insert into public.plan_members (plan_id, user_id, status, requested_at)
values (tests.id('an_plan'), tests.id('life_a'), 'requested', now() - interval '20 minutes');
update public.plan_members set status = 'approved', decided_at = now()
where plan_id = tests.id('an_plan') and user_id = tests.id('life_a');
select is((select (props->>'wait_minutes')::int from private.analytics_outbox
  where event = 'join_approved' and distinct_id = tests.id('life_a')), 20,
  'join_approved is queued for the requester with the wait time');
insert into ids values ('an_new', tests.member('Vee', 'woman', false));
update public.profiles set verification_status = 'pending' where id = tests.id('an_new');
update public.profiles set verification_status = 'verified' where id = tests.id('an_new');
select is((select props from private.analytics_outbox where event = 'verification_passed' and distinct_id = tests.id('an_new')),
  '{"attempt": 1, "manual": false}'::jsonb, 'verification_passed carries only attempt and manual');
select tests.login(tests.id('life_a'));
select throws_ok($$ select count(*) from private.analytics_outbox $$, '42501', null,
  'S-9: members cannot read the analytics outbox');
select throws_ok($$ select * from public.svc_analytics_pending(10) $$, '42501', null,
  'S-8: only the service role can drain the outbox');
select tests.logout();

select * from finish();
rollback;
