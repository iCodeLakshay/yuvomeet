-- Demo data for the dev project: Kota members, upcoming and past plans, chats, paid seats.
-- Every demo account signs in with email + password (see docs/demo-accounts.md).
-- Idempotent: rerunning skips rows that already exist. Never load into production.

-- Cities, colleges and the first venues come from seed.sql; a few more real Kota spots here.
insert into public.cities (id, name, slug, status, launch_date, center_lat, center_lng) values
  ('11111111-1111-4111-8111-111111111101', 'Kota', 'kota', 'live', '2026-10-24', 25.1825, 75.8391)
on conflict (slug) do nothing;

insert into public.venues (id, city_id, name, area_name, area_cell, lat, lng, address_line, hours, capacity, partner, late_events_allowed, status, approved_at) values
  ('33333333-3333-4333-8333-333333333306', '11111111-1111-4111-8111-111111111101', 'Seven Wonders Park', 'Riverfront', '883d8b449ffffff', 25.1747, 75.8436, 'Kishore Sagar Lake, near Chhatra Vilas Garden', '{"all":{"open":"06:00","close":"21:00"}}', 60, false, false, 'approved', now()),
  ('33333333-3333-4333-8333-333333333307', '11111111-1111-4111-8111-111111111101', 'Chambal Garden', 'Riverfront', '883d8b449ffffff', 25.1556, 75.8296, 'Amar Niwas Road, Chambal Garden', '{"all":{"open":"07:00","close":"20:00"}}', 80, false, false, 'approved', now()),
  ('33333333-3333-4333-8333-333333333308', '11111111-1111-4111-8111-111111111101', 'City Mall Food Court', 'Jawahar Nagar', '883d8b4499fffff', 25.1446, 75.8480, 'City Mall, Jhalawar Road', '{"all":{"open":"10:00","close":"22:00"}}', 40, true, true, 'approved', now()),
  ('33333333-3333-4333-8333-333333333309', '11111111-1111-4111-8111-111111111101', 'Coral Park Turf Arena', 'Coral Park', '883d8b449dfffff', 25.1342, 75.8241, 'Coral Park Main Road, near Bal Vihar', '{"all":{"open":"06:00","close":"22:00"}}', 22, true, true, 'approved', now()),
  ('33333333-3333-4333-8333-333333333310', '11111111-1111-4111-8111-111111111101', 'Kunhari Board Game Cafe', 'Kunhari', '883d8b449bfffff', 25.2018, 75.8573, 'Landmark City Road, Kunhari', '{"all":{"open":"11:00","close":"21:30"}}', 26, true, false, 'approved', now())
on conflict do nothing;

do $seed$
declare
  v_kota uuid := '11111111-1111-4111-8111-111111111101';
  v_pw text := extensions.crypt('Yuvomeet@123', extensions.gen_salt('bf'));
  v_today timestamptz := (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata';
  u record;
  p record;
  v_conv uuid;
  v_fee int;
begin
  -- -------------------------------------------------------------------------
  -- Members. id, email, first name, birth year, gender, area, interests, bio, tier, college
  -- -------------------------------------------------------------------------
  create temp table demo_users (
    id uuid, email text, first_name text, birth_year smallint, gender public.gender,
    area text, interests text[], bio text, tier public.entitlement, college uuid
  ) on commit drop;
  insert into demo_users values
    ('44444444-4444-4444-8444-444444444401', 'rohan@demo.yuvomeet.app', 'Rohan', 2003, 'man', 'Talwandi', '{chai-cafe,sports,tech}', 'IIIT Kota, 3rd year. Cricket on weekends, chai every evening.', 'premium', '22222222-2222-4222-8222-222222222201'),
    ('44444444-4444-4444-8444-444444444402', 'priya@demo.yuvomeet.app', 'Priya', 2004, 'woman', 'Vigyan Nagar', '{study,music,art}', 'NEET prep by day, guitar by night. Looking for a calm study group.', 'free', '22222222-2222-4222-8222-222222222202'),
    ('44444444-4444-4444-8444-444444444403', 'arjun@demo.yuvomeet.app', 'Arjun', 2002, 'man', 'Rajeev Gandhi Nagar', '{games,movies,food}', 'Catan, Codenames, anything with dice. I bring snacks.', 'plus', null),
    ('44444444-4444-4444-8444-444444444404', 'sneha@demo.yuvomeet.app', 'Sneha', 2003, 'woman', 'Mahaveer Nagar', '{photography,treks,food}', 'Sunrise walks and street food hunts around Kota.', 'free', '22222222-2222-4222-8222-222222222204'),
    ('44444444-4444-4444-8444-444444444405', 'karan@demo.yuvomeet.app', 'Karan', 2001, 'man', 'Coral Park', '{sports,fitness}', 'Box cricket and football at the turf. Always need a few more players.', 'free', null),
    ('44444444-4444-4444-8444-444444444406', 'ananya@demo.yuvomeet.app', 'Ananya', 2005, 'woman', 'Talwandi', '{study,chai-cafe}', 'JEE 2026. Pomodoro sessions with good coffee.', 'free', '22222222-2222-4222-8222-222222222203'),
    ('44444444-4444-4444-8444-444444444407', 'vikram@demo.yuvomeet.app', 'Vikram', 2000, 'man', 'Kunhari', '{music,art}', 'Play the cajon, looking for people to jam with.', 'premium', null),
    ('44444444-4444-4444-8444-444444444408', 'isha@demo.yuvomeet.app', 'Isha', 2004, 'woman', 'Jawahar Nagar', '{movies,food,games}', 'Weekend movie plans and long chats after.', 'free', '22222222-2222-4222-8222-222222222205'),
    ('44444444-4444-4444-8444-444444444409', 'aditya@demo.yuvomeet.app', 'Aditya', 2003, 'man', 'Vigyan Nagar', '{tech,study}', 'Building a startup between mock tests. Happy to talk product.', 'free', '22222222-2222-4222-8222-222222222201'),
    ('44444444-4444-4444-8444-444444444410', 'meera@demo.yuvomeet.app', 'Meera', 2002, 'woman', 'Riverfront', '{treks,photography,fitness}', 'Evening walks on the riverfront. Bring your camera.', 'plus', null),
    ('44444444-4444-4444-8444-444444444411', 'rahul@demo.yuvomeet.app', 'Rahul', 2004, 'man', 'Mahaveer Nagar', '{sports,games}', 'Chess and carrom champion of my hostel.', 'free', '22222222-2222-4222-8222-222222222202'),
    ('44444444-4444-4444-8444-444444444412', 'kavya@demo.yuvomeet.app', 'Kavya', 2003, 'woman', 'Coral Park', '{art,music,chai-cafe}', 'Sketching at cafés. Will draw you if you sit still long enough.', 'free', null);

  for u in select * from demo_users loop
    if not exists (select 1 from auth.users where id = u.id) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, v_pw, now(),
        '{"provider":"email","providers":["email"]}', jsonb_build_object('first_name', u.first_name), now(), now(),
        '', '', '', '', '', '', '', ''
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), u.id, u.id::text,
              jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
              'email', now(), now(), now());
    end if;

    update public.profiles set
      city_id = v_kota, first_name = u.first_name, birth_year = u.birth_year,
      declared_gender = u.gender, verified_gender = u.gender, bio = u.bio,
      interests = u.interests, languages = '{en,hi}',
      area_name = u.area, area_cell = (select a.cell from (values
        ('Talwandi', '883d8b4491fffff'), ('Vigyan Nagar', '883d8b4493fffff'), ('Mahaveer Nagar', '883d8b4495fffff'),
        ('Rajeev Gandhi Nagar', '883d8b4497fffff'), ('Jawahar Nagar', '883d8b4499fffff'), ('Kunhari', '883d8b449bfffff'),
        ('Coral Park', '883d8b449dfffff'), ('Riverfront', '883d8b449ffffff')) a(name, cell) where a.name = u.area),
      college_id = u.college, verification_status = 'verified', verified_at = now() - interval '30 days',
      status = 'active', rules_accepted_at = now() - interval '30 days',
      entitlement = u.tier,
      entitlement_until = case when u.tier = 'free' then null else now() + interval '30 days' end,
      created_at = now() - interval '60 days'
    where id = u.id;

    insert into public.consents (user_id, purpose, granted, policy_version)
    select u.id, x.purpose, true, '2026-10'
    from (values ('community_rules'::public.consent_purpose), ('terms_privacy'::public.consent_purpose)) x(purpose)
    where not exists (select 1 from public.consents c where c.user_id = u.id);
  end loop;

  update public.profile_stats s set plans_attended = x.att, plans_hosted = x.hosted
  from (values
    ('44444444-4444-4444-8444-444444444401'::uuid, 9, 4), ('44444444-4444-4444-8444-444444444402'::uuid, 6, 1),
    ('44444444-4444-4444-8444-444444444403'::uuid, 12, 5), ('44444444-4444-4444-8444-444444444404'::uuid, 7, 2),
    ('44444444-4444-4444-8444-444444444405'::uuid, 15, 6), ('44444444-4444-4444-8444-444444444406'::uuid, 4, 0),
    ('44444444-4444-4444-8444-444444444407'::uuid, 8, 3), ('44444444-4444-4444-8444-444444444408'::uuid, 5, 1),
    ('44444444-4444-4444-8444-444444444409'::uuid, 3, 1), ('44444444-4444-4444-8444-444444444410'::uuid, 10, 4),
    ('44444444-4444-4444-8444-444444444411'::uuid, 6, 0), ('44444444-4444-4444-8444-444444444412'::uuid, 2, 0)
  ) x(id, att, hosted)
  where s.user_id = x.id;

  -- -------------------------------------------------------------------------
  -- Plans. id, host, venue, title, description, activity, day offset, start hour, hours, capacity, price, members
  -- -------------------------------------------------------------------------
  create temp table demo_plans (
    id uuid, host uuid, venue uuid, title text, description text, activity text,
    day_offset int, start_hour numeric, hours numeric, capacity smallint, price int, members uuid[]
  ) on commit drop;
  insert into demo_plans values
    ('55555555-5555-4555-8555-555555555501', '44444444-4444-4444-8444-444444444403', '33333333-3333-4333-8333-333333333310',
     'Catan & Codenames night', 'Beginners welcome, I''ll teach the rules. Snacks on me, games on the café.', 'board-games',
     1, 17.5, 3, 6, null, '{44444444-4444-4444-8444-444444444401,44444444-4444-4444-8444-444444444408,44444444-4444-4444-8444-444444444411}'),
    ('55555555-5555-4555-8555-555555555502', '44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333305',
     'Silent study sprint: 4 x 50 min', 'Phones in the basket, 10-minute chai breaks. Bring your own books.', 'study-session',
     1, 10, 4, 5, null, '{44444444-4444-4444-8444-444444444406,44444444-4444-4444-8444-444444444409}'),
    ('55555555-5555-4555-8555-555555555503', '44444444-4444-4444-8444-444444444405', '33333333-3333-4333-8333-333333333309',
     'Saturday box cricket', '6-a-side, 2 hours on the turf. Turf fee is included in the price.', 'sports',
     2, 18, 2, 10, 14900, '{44444444-4444-4444-8444-444444444401,44444444-4444-4444-8444-444444444411,44444444-4444-4444-8444-444444444409}'),
    ('55555555-5555-4555-8555-555555555504', '44444444-4444-4444-8444-444444444410', '33333333-3333-4333-8333-333333333306',
     'Sunset photo walk at Seven Wonders', 'Golden hour around Kishore Sagar. Phone cameras are fine.', 'walk-talk',
     2, 16.5, 2, 8, null, '{44444444-4444-4444-8444-444444444404,44444444-4444-4444-8444-444444444412}'),
    ('55555555-5555-4555-8555-555555555505', '44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333303',
     'Startup chai: ideas over kulhad', 'Pitch your side project in 2 minutes, get honest feedback. Chai and snacks included.', 'chai-cafe',
     3, 18, 2, 8, 19900, '{44444444-4444-4444-8444-444444444409,44444444-4444-4444-8444-444444444403,44444444-4444-4444-8444-444444444402}'),
    ('55555555-5555-4555-8555-555555555506', '44444444-4444-4444-8444-444444444407', '33333333-3333-4333-8333-333333333301',
     'Unplugged acoustic jam', 'Guitar, cajon, vocals. Bollywood unplugged and some indie. All levels.', 'music-jam',
     3, 17, 2.5, 7, null, '{44444444-4444-4444-8444-444444444402,44444444-4444-4444-8444-444444444412}'),
    ('55555555-5555-4555-8555-555555555507', '44444444-4444-4444-8444-444444444404', '33333333-3333-4333-8333-333333333308',
     'Street food crawl: kachori to kulfi', 'We start at the food court and rate everything. Food cost is shared on the spot.', 'chai-cafe',
     4, 12.5, 3, 6, null, '{44444444-4444-4444-8444-444444444408}'),
    ('55555555-5555-4555-8555-555555555508', '44444444-4444-4444-8444-444444444408', '33333333-3333-4333-8333-333333333304',
     'Book club: The Alchemist', 'Read or reread it before we meet. Coffee and a slow discussion.', 'book-club',
     5, 11, 2, 6, null, '{44444444-4444-4444-8444-444444444406}'),
    ('55555555-5555-4555-8555-555555555509', '44444444-4444-4444-8444-444444444411', '33333333-3333-4333-8333-333333333307',
     'Morning walk & chess in the garden', 'Easy 3 km loop, then a few games of chess on the lawn.', 'walk-talk',
     6, 7, 2, 6, null, '{}'),
    ('55555555-5555-4555-8555-555555555510', '44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333309',
     'Football 5-a-side', 'Friendly game, mixed skill levels. Turf and water included.', 'sports',
     6, 18.5, 1.5, 10, 9900, '{44444444-4444-4444-8444-444444444405,44444444-4444-4444-8444-444444444403}'),
    -- Past plans: give everyone history, earnings and ratings to look at.
    ('55555555-5555-4555-8555-555555555511', '44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333302',
     'Riverfront cycling meetup', 'Easy ride along the riverfront, chai at the end.', 'walk-talk',
     -3, 17, 2, 8, 9900, '{44444444-4444-4444-8444-444444444403,44444444-4444-4444-8444-444444444405,44444444-4444-4444-8444-444444444410,44444444-4444-4444-8444-444444444404}'),
    ('55555555-5555-4555-8555-555555555512', '44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333303',
     'Sketch & sip', 'Sketchbooks, pencils and cold coffee.', 'chai-cafe',
     -5, 16, 2, 6, null, '{44444444-4444-4444-8444-444444444412,44444444-4444-4444-8444-444444444401}');

  for p in select * from demo_plans loop
    continue when exists (select 1 from public.plans where id = p.id);
    insert into public.plans (id, city_id, host_id, venue_id, title, description, activity, starts_at, ends_at,
                              capacity, audience, requires_approval, price_paise, status, created_at)
    values (p.id, v_kota, p.host, p.venue, p.title, p.description, p.activity,
            v_today + make_interval(days => p.day_offset) + make_interval(mins => (p.start_hour * 60)::int),
            v_today + make_interval(days => p.day_offset) + make_interval(mins => ((p.start_hour + p.hours) * 60)::int),
            p.capacity, 'everyone', true, p.price,
            case when p.day_offset < 0 then 'completed' else 'open' end::public.plan_status,
            now() - interval '2 days');

    insert into public.plan_members (plan_id, user_id, status, requested_at, decided_at)
    values (p.id, p.host, 'approved', now() - interval '2 days', now() - interval '2 days');
    insert into public.plan_members (plan_id, user_id, status, requested_at, decided_at, paid_at, checked_in_at, note)
    select p.id, m, case when p.day_offset < 0 then 'attended' else 'approved' end::public.member_status,
           now() - interval '1 day', now() - interval '20 hours',
           case when p.price is not null then now() - interval '19 hours' end,
           case when p.day_offset < 0 then v_today + make_interval(days => p.day_offset) + make_interval(mins => (p.start_hour * 60)::int) end,
           'Count me in!'
    from unnest(p.members) m;
    if p.day_offset < 0 then
      update public.plan_members set status = 'attended' where plan_id = p.id and user_id = p.host;
    end if;

    insert into public.conversations (kind, plan_id, status, closes_at)
    values ('plan', p.id, case when p.day_offset < -1 then 'closed' else 'open' end::public.conversation_status,
            v_today + make_interval(days => p.day_offset + 2))
    returning id into v_conv;

    -- Paid seats: payments with the platform fee split.
    if p.price is not null then
      v_fee := (p.price * private.setting_int('platform_fee_bps')) / 10000;
      insert into public.payments (user_id, product_id, kind, plan_id, host_id, amount_paise, platform_fee_paise,
                                   host_payout_paise, status, created_at, paid_at)
      select m, 'plan_seat', 'plan', p.id, p.host, p.price, v_fee, p.price - v_fee, 'paid',
             now() - interval '19 hours', now() - interval '19 hours'
      from unnest(p.members) m;
    end if;

    -- A short chat in every plan with members.
    if cardinality(p.members) > 0 then
      insert into public.messages (id, conversation_id, sender_id, body, created_at)
      select gen_random_uuid(), v_conv, x.sender, x.body, now() - interval '18 hours' + make_interval(mins => x.n * 7)
      from (values
        (1, p.host, 'Hey everyone! Excited for this. I''ll be there 10 minutes early.'),
        (2, p.members[1], 'Same here. Anything we should bring?'),
        (3, p.host, 'Just yourselves. Look for the group near the entrance.'),
        (4, coalesce(p.members[2], p.members[1]), 'Perfect, see you all there 🙌')
      ) x(n, sender, body);
    end if;
  end loop;

  -- A pending request on Rohan's upcoming plan, and on Priya's study sprint, so hosts see a queue.
  insert into public.plan_members (plan_id, user_id, status, requested_at, note) values
    ('55555555-5555-4555-8555-555555555505', '44444444-4444-4444-8444-444444444407', 'requested', now() - interval '2 hours', 'Working on a music app, would love feedback!'),
    ('55555555-5555-4555-8555-555555555505', '44444444-4444-4444-8444-444444444404', 'requested', now() - interval '1 hour', null),
    ('55555555-5555-4555-8555-555555555502', '44444444-4444-4444-8444-444444444411', 'requested', now() - interval '3 hours', 'Preparing for JEE Advanced')
  on conflict do nothing;

  -- A payout already sent to Rohan for the past cycling meetup.
  insert into public.payout_accounts (user_id, upi_id, holder_name)
  values ('44444444-4444-4444-8444-444444444401', 'rohan.demo@okaxis', 'Rohan Sharma')
  on conflict do nothing;
  insert into public.host_payouts (host_id, amount_paise, reference)
  select '44444444-4444-4444-8444-444444444401', 26700, 'UPI demo payout'
  where not exists (select 1 from public.host_payouts where host_id = '44444444-4444-4444-8444-444444444401');
end;
$seed$;
