-- Realistic test data for a DEV project. Additive and idempotent: it never touches existing
-- rows, and every row it creates hangs off an id that starts with `5eed` (see dev-test-data-cleanup.sql).
--
-- Run it with `supabase db query --linked -f supabase/seed/dev-test-data.sql`, the Supabase MCP
-- execute_sql, or the SQL editor. It follows the app's own rules: members are verified adults in
-- Kota, plans sit at approved venues, counts come from the sync_plan_membership trigger, and no
-- text trips the screening rules. The first real (non-seed) active profile is treated as "you",
-- so the Plans, Chats and Notifications tabs have something to show for the account you sign in
-- with. Seed members have no phone or password, so they cannot be signed in as; they are the
-- other people in the app. They have no photos (uploads need real files), so avatars show initials.

create function pg_temp.ist(p_days int, p_time text) returns timestamptz language sql as $$
  select ((now() at time zone 'Asia/Kolkata')::date + p_days + p_time::time) at time zone 'Asia/Kolkata'
$$;

create function pg_temp.mkplan(
  p_id uuid, p_host uuid, p_title text, p_desc text, p_activity text, p_venue uuid,
  p_start timestamptz, p_hours numeric, p_cap int, p_audience public.plan_audience,
  p_college uuid, p_approval boolean
) returns void language plpgsql as $$
begin
  insert into public.plans (id, city_id, host_id, venue_id, title, description, activity, starts_at, ends_at,
    capacity, audience, college_id, requires_approval)
  values (p_id, '11111111-1111-4111-8111-111111111101', p_host, p_venue, p_title, p_desc, p_activity, p_start,
    p_start + make_interval(mins => (p_hours * 60)::int), p_cap, p_audience, p_college, p_approval);
  insert into public.plan_members (plan_id, user_id, status, decided_at) values (p_id, p_host, 'approved', now());
  insert into public.conversations (plan_id, closes_at)
  values (p_id, p_start + make_interval(mins => (p_hours * 60)::int) + interval '24 hours');
end $$;

create function pg_temp.member(p_plan uuid, p_user uuid, p_status public.member_status, p_note text default null,
  p_requested_ago interval default interval '3 hours') returns void language plpgsql as $$
begin
  if p_user is null then return; end if;
  insert into public.plan_members (plan_id, user_id, status, note, requested_at, decided_at, checked_in_at)
  values (p_plan, p_user, p_status, p_note, now() - p_requested_ago,
    case when p_status = 'requested' then null else now() - p_requested_ago + interval '20 minutes' end,
    case when p_status = 'attended' then now() - p_requested_ago else null end);
end $$;

create function pg_temp.say(p_plan uuid, p_user uuid, p_body text, p_ago interval) returns void language plpgsql as $$
begin
  if p_user is null then return; end if;
  -- messages.id has no default: the app supplies a client UUID so sends are idempotent.
  insert into public.messages (id, conversation_id, sender_id, body, created_at)
  select gen_random_uuid(), c.id, p_user, p_body, now() - p_ago from public.conversations c where c.plan_id = p_plan;
end $$;

do $seed$
declare
  me uuid := (select p.id from public.profiles p where p.id::text not like '5eed%' and p.status = 'active' order by p.created_at limit 1);
  u constant uuid[] := array[
    '5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000003',
    '5eed0000-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000005', '5eed0000-0000-4000-8000-000000000006',
    '5eed0000-0000-4000-8000-000000000007', '5eed0000-0000-4000-8000-000000000008', '5eed0000-0000-4000-8000-000000000009',
    '5eed0000-0000-4000-8000-000000000010', '5eed0000-0000-4000-8000-000000000011', '5eed0000-0000-4000-8000-000000000012'];
  iiit constant uuid := '22222222-2222-4222-8222-222222222201';
  allen constant uuid := '22222222-2222-4222-8222-222222222202';
  chai constant uuid := '33333333-3333-4333-8333-333333333301';
  river constant uuid := '33333333-3333-4333-8333-333333333302';
  nirvana constant uuid := '33333333-3333-4333-8333-333333333303';
  roastery constant uuid := '33333333-3333-4333-8333-333333333304';
  books constant uuid := '33333333-3333-4333-8333-333333333305';
  p constant uuid[] := array[
    '5eed1000-0000-4000-8000-000000000001', '5eed1000-0000-4000-8000-000000000002', '5eed1000-0000-4000-8000-000000000003',
    '5eed1000-0000-4000-8000-000000000004', '5eed1000-0000-4000-8000-000000000005', '5eed1000-0000-4000-8000-000000000006',
    '5eed1000-0000-4000-8000-000000000007', '5eed1000-0000-4000-8000-000000000008', '5eed1000-0000-4000-8000-000000000009',
    '5eed1000-0000-4000-8000-000000000010', '5eed1000-0000-4000-8000-000000000011'];
  v_report uuid := '5eed2000-0000-4000-8000-000000000001';
  v_report2 uuid := '5eed2000-0000-4000-8000-000000000002';
begin
  if exists (select 1 from auth.users where id = u[1]) then
    raise notice 'Seed data is already present; nothing to do. Run dev-test-data-cleanup.sql first to reseed.';
    return;
  end if;

  -- ---------------------------------------------------------------------------------------------
  -- People: 9 verified adults (women and men, two colleges), plus the awkward ones
  -- ---------------------------------------------------------------------------------------------
  insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
  select x.id, 'authenticated', 'authenticated', lower(x.first_name) || '@seed.yuvomeet.test', now(), now() - make_interval(days => x.age_days), now()
  from (values
    (u[1], 'Ananya', 40), (u[2], 'Priya', 35), (u[3], 'Rohan', 60), (u[4], 'Meera', 25), (u[5], 'Tanmay', 50),
    (u[6], 'Sneha', 20), (u[7], 'Ishita', 15), (u[8], 'Arjun', 45), (u[9], 'Kabir', 1), (u[10], 'Vikram', 12),
    (u[11], 'Diya', 30), (u[12], 'Aarav', 28)) as x(id, first_name, age_days);

  update public.profiles pr set
    first_name = v.first_name, declared_gender = v.gender::public.gender, birth_year = v.birth_year,
    bio = v.bio, interests = string_to_array(v.interests, ','), languages = '{English,Hindi}',
    area_name = v.area, area_cell = (select ve.area_cell from public.venues ve where ve.area_name = v.area limit 1),
    college_id = v.college::uuid, city_id = '11111111-1111-4111-8111-111111111101',
    status = v.status::public.profile_status, status_reason = v.reason,
    verification_status = v.verification::public.verification_status,
    verified_gender = case when v.verification = 'verified' then v.gender::public.gender end,
    verified_at = case when v.verification = 'verified' then now() - make_interval(days => v.age_days - 1) end,
    rules_accepted_at = case when v.status = 'onboarding' then null else now() end,
    created_at = now() - make_interval(days => v.age_days)
  from (values
    (u[1], 'Ananya', 'woman', 2003, 'Final-year medical student. Happiest with a book and a strong chai.', 'study,chai-cafe,movies', 'Talwandi', '22222222-2222-4222-8222-222222222204', 'active', null, 'verified', 40),
    (u[2], 'Priya', 'woman', 2002, 'Board game collector. I will always bring Catan and snacks.', 'games,food,music', 'Vigyan Nagar', allen::text, 'active', null, 'verified', 35),
    (u[3], 'Rohan', 'man', 2001, 'Runs a small photography page. Love golden hour at the riverfront.', 'photography,treks,chai-cafe', 'Riverfront', null, 'active', null, 'verified', 60),
    (u[4], 'Meera', 'woman', 2004, 'Design student. Always up for a slow walk and a long conversation.', 'art,photography,music', 'Talwandi', iiit::text, 'active', null, 'verified', 25),
    (u[5], 'Tanmay', 'man', 2003, 'Guitar, code and cutting chai. Organising weekend jam sessions.', 'music,tech,chai-cafe', 'Vigyan Nagar', iiit::text, 'active', null, 'verified', 50),
    (u[6], 'Sneha', 'woman', 2003, 'Early riser, evening walker. Collecting sunsets around Kota.', 'fitness,treks,photography', 'Riverfront', allen::text, 'active', null, 'verified', 20),
    (u[7], 'Ishita', 'woman', 2005, 'New to Kota and keen to meet people who enjoy quiet cafes.', 'study,food,movies', 'Rajeev Gandhi Nagar', null, 'active', null, 'verified', 15),
    (u[8], 'Arjun', 'man', 2002, 'Cricket on weekends, code on weekdays.', 'sports,tech,games', 'Talwandi', iiit::text, 'active', null, 'verified', 45),
    (u[9], 'Kabir', 'man', 2004, null, '', 'Talwandi', null, 'onboarding', null, 'unverified', 1),
    (u[10], 'Vikram', 'man', 2001, 'Marathon training, mostly.', 'fitness,sports', 'Riverfront', null, 'active', null, 'manual_review', 12),
    (u[11], 'Diya', 'woman', 2003, 'Reader and sketcher.', 'art,study', 'Vigyan Nagar', null, 'suspended', 'Paused while we review a report.', 'verified', 30),
    (u[12], 'Aarav', 'man', 2002, 'Football, films and food walks.', 'sports,movies,food', 'Talwandi', null, 'active', null, 'verified', 28)
  ) as v(id, first_name, gender, birth_year, bio, interests, area, college, status, reason, verification, age_days)
  where pr.id = v.id;

  update public.profile_stats set plans_attended = 9, plans_hosted = 3 where user_id = u[1];
  update public.profile_stats set plans_attended = 14, plans_hosted = 6 where user_id = u[2];
  update public.profile_stats set plans_attended = 22, plans_hosted = 8, late_cancel_count_30d = 2 where user_id = u[3];
  update public.profile_stats set plans_attended = 5, plans_no_show = 1 where user_id = u[4];
  update public.profile_stats set plans_attended = 11, plans_hosted = 4 where user_id = u[5];
  update public.profile_stats set plans_attended = 4, plans_no_show = 2 where user_id = u[6];
  update public.profile_stats set plans_attended = 2 where user_id = u[7];
  update public.profile_stats set plans_attended = 7, plans_hosted = 2 where user_id = u[8];
  update public.profile_stats set reports_received_30d = 1 where user_id = u[11];

  insert into public.consents (user_id, purpose, granted, policy_version)
  select x, c.purpose::public.consent_purpose, true, '2026-10'
  from unnest(u) x, (values ('terms_privacy'), ('community_rules'), ('notifications')) c(purpose)
  where x <> u[9];
  insert into public.waitlist_signups (user_id, city_id) values
    (u[9], '11111111-1111-4111-8111-111111111102'), (u[12], '11111111-1111-4111-8111-111111111103');

  -- ---------------------------------------------------------------------------------------------
  -- Plans: every status, audience and entry rule
  -- ---------------------------------------------------------------------------------------------
  -- 1. Open, host approves, filling up
  perform pg_temp.mkplan(p[1], u[3], 'Evening chai and casual conversation', 'Easy evening at Chai Sutta Bar. Come as you are, bring a friend if you like.',
    'chai-cafe', chai, pg_temp.ist(1, '18:30'), 2, 6, 'everyone', null, true);
  perform pg_temp.member(p[1], u[1], 'approved', null, interval '1 day');
  perform pg_temp.member(p[1], u[2], 'approved', null, interval '20 hours');
  perform pg_temp.member(p[1], u[5], 'approved', null, interval '10 hours');
  perform pg_temp.member(p[1], u[6], 'requested', 'Hi! Would love to join, I know the place well.', interval '2 hours');

  -- 2. Full table (capacity 4)
  perform pg_temp.mkplan(p[2], u[2], 'Catan night at the Roastery', 'Two copies of Catan and one of Exploding Kittens. Beginners welcome.',
    'board-games', roastery, pg_temp.ist(2, '17:00'), 3, 4, 'everyone', null, true);
  perform pg_temp.member(p[2], u[4], 'approved', null, interval '2 days');
  perform pg_temp.member(p[2], u[8], 'approved', null, interval '30 hours');
  perform pg_temp.member(p[2], u[12], 'approved', null, interval '26 hours');
  perform pg_temp.member(p[2], u[7], 'declined', 'Can I join?', interval '20 hours');

  -- 3. Women only (visible only to verified women, S-15)
  perform pg_temp.mkplan(p[3], u[1], 'Women''s study circle', 'Quiet study hour followed by chai and a chat about prep strategies.',
    'study-session', books, pg_temp.ist(2, '16:00'), 2, 6, 'women_only', null, true);
  perform pg_temp.member(p[3], u[7], 'approved', null, interval '1 day');
  perform pg_temp.member(p[3], u[4], 'requested', 'Studying for exams too, would be great.', interval '5 hours');

  -- 4. Same college only (IIIT), late partner venue, ends after 9 PM
  perform pg_temp.mkplan(p[4], u[5], 'IIIT acoustic jam night', 'Bring an instrument or just your ears. All skill levels welcome.',
    'music-jam', nirvana, pg_temp.ist(3, '19:30'), 2.5, 8, 'same_college', iiit, true);
  perform pg_temp.member(p[4], u[8], 'approved', null, interval '1 day');
  perform pg_temp.member(p[4], u[4], 'approved', null, interval '18 hours');

  -- 5. Instant join, no approval
  perform pg_temp.mkplan(p[5], u[6], 'Sunset walk and talk', 'Slow 3 km walk along the promenade, then chai. No rush, no agenda.',
    'walk-talk', river, pg_temp.ist(1, '17:30'), 1.5, 8, 'everyone', null, false);
  perform pg_temp.member(p[5], u[1], 'approved', null, interval '1 day');
  perform pg_temp.member(p[5], u[2], 'approved', null, interval '1 day');
  perform pg_temp.member(p[5], u[7], 'approved', null, interval '8 hours');
  perform pg_temp.member(p[5], me, 'approved', null, interval '4 hours');

  -- 6. Largest group (10), instant, early morning
  perform pg_temp.mkplan(p[6], u[8], 'Sunday cricket at the riverfront', 'Friendly tennis-ball match. Teams picked on the spot.',
    'sports', river, pg_temp.ist(4, '07:00'), 2, 10, 'everyone', null, false);
  perform pg_temp.member(p[6], u[3], 'approved', null, interval '1 day');
  perform pg_temp.member(p[6], u[5], 'approved', null, interval '1 day');
  perform pg_temp.member(p[6], u[12], 'approved', null, interval '12 hours');

  -- 7. Starts in 15 minutes: check-in window, the chat is live
  perform pg_temp.mkplan(p[7], u[4], 'Quick chai break', 'Short catch-up between classes. Table near the entrance.',
    'chai-cafe', chai, now() + interval '15 minutes', 1.5, 5, 'everyone', null, true);
  perform pg_temp.member(p[7], u[2], 'approved', null, interval '6 hours');
  perform pg_temp.member(p[7], me, 'approved', null, interval '5 hours');

  -- 8. Hosted by you, with pending requests to review
  perform pg_temp.mkplan(p[8], me, 'Board games and chai evening', 'Bring your favourite game or pick one of mine. Chai on the table.',
    'board-games', nirvana, pg_temp.ist(2, '18:00'), 3, 6, 'everyone', null, true);
  perform pg_temp.member(p[8], u[1], 'approved', null, interval '1 day');
  perform pg_temp.member(p[8], u[4], 'requested', 'Love board games! Have played Catan and Codenames.', interval '3 hours');
  perform pg_temp.member(p[8], u[5], 'requested', 'Can I bring a friend next time too?', interval '2 hours');
  perform pg_temp.member(p[8], u[8], 'requested', null, interval '90 minutes');

  -- 9. Finished yesterday: attended and no-show, ratings open
  perform pg_temp.mkplan(p[9], u[2], 'Chai and book club', 'This month: short stories. No homework, bring whatever you are reading.',
    'book-club', books, pg_temp.ist(-1, '17:00'), 2, 6, 'everyone', null, true);
  update public.plans set status = 'completed' where id = p[9];
  perform pg_temp.member(p[9], u[1], 'attended', null, interval '3 days');
  perform pg_temp.member(p[9], me, 'attended', null, interval '3 days');
  perform pg_temp.member(p[9], u[6], 'no_show', null, interval '3 days');
  update public.plan_members set checked_in_at = starts_at_of.t from (select starts_at t from public.plans where id = p[9]) starts_at_of
    where plan_id = p[9] and status = 'attended';
  insert into public.ratings (plan_id, rater_id, ratee_id, felt_safe, showed_up) values
    (p[9], u[1], u[2], true, true), (p[9], u[1], me, true, true), (p[9], u[2], u[6], true, false);

  -- 10. Cancelled by the host (late)
  perform pg_temp.mkplan(p[10], u[4], 'Golden hour photo walk', 'Camera or phone, both fine.', 'walk-talk', river, pg_temp.ist(1, '16:30'), 2, 6, 'everyone', null, false);
  perform pg_temp.member(p[10], u[3], 'approved', null, interval '2 days');
  update public.plans set status = 'cancelled', cancel_reason = 'Rain forecast for the evening', cancelled_at = now() - interval '2 hours', late_cancel = true where id = p[10];
  update public.conversations set status = 'closed' where plan_id = p[10];

  -- 11. You asked to join, waiting on the host
  perform pg_temp.mkplan(p[11], u[5], 'Trek planning meetup', 'Planning a day trek for the month end. Share ideas, pick a date, split rides.',
    'trek', river, pg_temp.ist(3, '06:30'), 2, 8, 'everyone', null, true);
  perform pg_temp.member(p[11], u[8], 'approved', null, interval '1 day');
  perform pg_temp.member(p[11], me, 'requested', 'Hi! I have done a few treks near Bundi and would be happy to share tips.', interval '3 hours');

  -- ---------------------------------------------------------------------------------------------
  -- Group chats
  -- ---------------------------------------------------------------------------------------------
  perform pg_temp.say(p[1], u[3], 'Hey everyone! I will hold the corner table near the lights.', interval '20 hours');
  perform pg_temp.say(p[1], u[1], 'Lovely, I will be there at half past six.', interval '19 hours');
  perform pg_temp.say(p[1], u[2], 'Same. Should we order together or separately?', interval '18 hours');
  perform pg_temp.say(p[1], u[3], 'Separately is fine, everyone pays for their own.', interval '17 hours');

  perform pg_temp.say(p[5], u[6], 'Meeting at Gate 3, near the steps. Wear comfortable shoes!', interval '7 hours');
  perform pg_temp.say(p[5], u[1], 'Can''t wait. Is it fine if we walk slowly?', interval '6 hours');
  perform pg_temp.say(p[5], u[6], 'Very slow. We stop for photos.', interval '5 hours');
  perform pg_temp.say(p[5], me, 'See you there.', interval '3 hours');

  perform pg_temp.say(p[7], u[4], 'Got us a table near the entrance.', interval '10 minutes');
  perform pg_temp.say(p[7], u[2], 'Running 5 minutes late, save me a seat!', interval '6 minutes');
  perform pg_temp.say(p[7], me, 'On my way.', interval '2 minutes');

  perform pg_temp.say(p[8], me, 'Welcome everyone! I will bring Catan and Codenames.', interval '20 hours');
  perform pg_temp.say(p[8], u[1], 'Excited! I can bring Uno too.', interval '18 hours');

  perform pg_temp.say(p[9], u[2], 'Thanks all for coming. Next month we try poetry.', interval '20 hours');
  perform pg_temp.say(p[9], u[1], 'Loved it. The second story stayed with me.', interval '19 hours');
  perform pg_temp.say(p[9], me, 'Same here, great pick.', interval '18 hours');

  -- ---------------------------------------------------------------------------------------------
  -- Notifications for you (join requests and approvals come from the triggers above)
  -- ---------------------------------------------------------------------------------------------
  if me is not null then
    insert into public.notifications (user_id, category, kind, title, body, plan_id, created_at, read_at) values
      (me, 'plan', 'rating_prompt', 'How was Chai and book club?', 'Rate your group privately. It takes a few seconds.', p[9], now() - interval '2 hours', null),
      (me, 'account', 'verification_passed', 'You''re verified', 'Your 18+ verified badge is active. You can join and host plans.', null, now() - interval '3 days', now() - interval '3 days');
  end if;

  -- ---------------------------------------------------------------------------------------------
  -- Safety and moderation edge cases (feed the admin console)
  -- ---------------------------------------------------------------------------------------------
  insert into public.blocks (blocker_id, blocked_id) values (u[3], u[12]);
  insert into public.reports (id, reporter_id, target_user_id, plan_id, reason, severity, details) values
    (v_report, u[1], u[11], p[9], 'harassment', 'standard', 'Repeated unwanted messages after the plan ended.'),
    (v_report2, u[2], u[6], p[9], 'no_show', 'standard', 'Did not turn up and did not tell the host.');
  insert into public.moderation_queue (subject, subject_id, user_id, severity, due_at) values
    ('report', v_report, u[11], 'standard', now() + interval '20 hours'),
    ('report', v_report2, u[6], 'standard', now() + interval '22 hours');
  insert into public.appeals (user_id, subject, subject_id, message) values
    (u[11], 'suspension', u[11], 'I believe this was a misunderstanding. I only replied to a message in the group chat.');
  insert into public.moderation_queue (subject, subject_id, user_id, severity, due_at)
  select 'appeal', a.id, a.user_id, 'standard', a.due_at from public.appeals a where a.user_id = u[11];

  raise notice 'Seeded 12 members, 11 plans and their chats. You are %.', coalesce(me::text, '(no real profile found: seeded members only)');
end
$seed$;

select
  (select count(*) from auth.users where id::text like '5eed%') as seed_users,
  (select count(*) from public.plans where id::text like '5eed%') as seed_plans,
  (select count(*) from public.plan_members pm where pm.plan_id::text like '5eed%') as memberships,
  (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id where c.plan_id::text like '5eed%') as messages;
