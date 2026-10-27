-- =============================================================================
-- Yuvomeet Seed Data (Local & Staging: Kota live, waitlist cities, venues, terms)
-- =============================================================================

insert into private.settings (key, val) values
  ('free_joins_per_week', '2'),
  ('free_hosts_per_week', '1'),
  ('new_account_days', '7'),
  ('new_join_per_day', '5'),
  ('new_msg_per_day', '20'),
  ('plan_min_lead_hours', '3'),
  ('plan_cutoff_local', '21:00'),
  ('checkin_radius_m', '150'),
  ('checkin_window_min', '30'),
  ('chat_close_hours', '24'),
  ('kyc_daily_cap', '300')
on conflict (key) do update set val = excluded.val;

insert into private.screen_terms (term, lang, action) values
  ('insta', 'en', 'reject'),
  ('snapchat', 'en', 'reject'),
  ('telegram', 'en', 'reject'),
  ('whatsapp', 'en', 'reject'),
  ('hookup', 'en', 'hold'),
  ('fwb', 'en', 'hold'),
  ('nudes', 'en', 'hold'),
  ('escort', 'en', 'hold'),
  ('paid meet', 'en', 'hold'),
  ('chutiya', 'hi', 'hold'),
  ('अश्लील', 'hi', 'hold')
on conflict do nothing;

insert into public.cities (id, name, slug, status, launch_date, center_lat, center_lng) values
  ('11111111-1111-4111-8111-111111111101', 'Kota', 'kota', 'live', '2026-10-24', 25.1825, 75.8391),
  ('11111111-1111-4111-8111-111111111102', 'Jaipur', 'jaipur', 'waitlist', null, 26.9124, 75.7873),
  ('11111111-1111-4111-8111-111111111103', 'Pune', 'pune', 'waitlist', null, 18.5204, 73.8567),
  ('11111111-1111-4111-8111-111111111104', 'Indore', 'indore', 'waitlist', null, 22.7196, 75.8577),
  ('11111111-1111-4111-8111-111111111105', 'Delhi NCR', 'delhi-ncr', 'waitlist', null, 28.6139, 77.2090)
on conflict (slug) do nothing;

insert into public.colleges (id, city_id, name, status) values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', 'IIIT Kota / RTU Campus', 'active'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101', 'Allen Career Institute (Samyak / Safalya)', 'active'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111101', 'Resonance & Motion Study Circle', 'active'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111101', 'Government Medical College Kota', 'active'),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111101', 'Career Point University Kota', 'active')
on conflict do nothing;

insert into public.activities (slug, label_en, label_hi, sort) values
  ('chai-cafe', 'Chai & Cafe', 'चाय और कैफ़े', 1),
  ('study-session', 'Study Session', 'पढ़ाई सेशन', 2),
  ('board-games', 'Board Games', 'बोर्ड गेम्स', 3),
  ('walk-talk', 'Walk & Talk', 'सैर और बातचीत', 4),
  ('music-jam', 'Music & Jam', 'म्यूज़िक जैम', 5),
  ('sports-cricket', 'Sports & Cricket', 'खेल और क्रिकेट', 6),
  ('book-club', 'Book & Reading', 'किताबें और रीडिंग', 7),
  ('weekend-trek', 'Morning Trek', 'सुबह का ट्रेक', 8)
on conflict (slug) do nothing;

insert into public.interests (slug, label_en, label_hi, sort) values
  ('chai-cafe', 'Chai & Cafes', 'चाय और कैफ़े', 1),
  ('board-games', 'Board Games', 'बोर्ड गेम्स', 2),
  ('study-sessions', 'Study Buddy', 'स्टडी बडी', 3),
  ('evening-walks', 'Riverfront Walks', 'रिवरफ्रंट सैर', 4),
  ('indie-music', 'Acoustic & Indie', 'म्यूज़िक और गिटार', 5),
  ('cricket-badminton', 'Badminton & Turf', 'बैडमिंटन और टर्फ़', 6),
  ('coding-tech', 'Coding & Startups', 'कोडिंग और टेक', 7),
  ('photography', 'Street Photography', 'फ़ोटोग्राफ़ी', 8),
  ('quizzes-trivia', 'Quizzes & Trivia', 'क्विज़ और ट्रिविया', 9),
  ('anime-films', 'Films & Anime', 'फ़िल्में और एनीमे', 10)
on conflict (slug) do nothing;

insert into public.venues (id, city_id, name, area_name, area_cell, lat, lng, address_line, capacity, partner, late_events_allowed, status) values
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111101', 'Chai Sutta Bar, Vigyan Nagar', 'Vigyan Nagar', '883d8b4493fffff', 25.1483, 75.8442, 'Plot 14, Main Road, Vigyan Nagar, Kota', 30, true, true, 'approved'),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111101', 'Chambal Riverfront, Gate 3', 'Gumanpura & Riverfront', '883d8b449ffffff', 25.1802, 75.8295, 'Promenade Plaza, Chambal Riverfront Gate 3, Kota', 50, false, false, 'approved'),
  ('33333333-3333-4333-8333-333333333303', '11111111-1111-4111-8111-111111111101', 'Cafe Nirvana, Talwandi', 'Talwandi', '883d8b4491fffff', 25.1419, 75.8364, 'Sector 2 Circle, Near Commerce College, Talwandi, Kota', 24, true, true, 'approved'),
  ('33333333-3333-4333-8333-333333333304', '11111111-1111-4111-8111-111111111101', 'Roastery Coffee House, Sector 4', 'Talwandi', '883d8b4491fffff', 25.1398, 75.8380, 'Sector 4 Main Market, Talwandi, Kota', 28, true, false, 'approved'),
  ('33333333-3333-4333-8333-333333333305', '11111111-1111-4111-8111-111111111101', 'The Bookworm Study Lounge', 'Rajeev Gandhi Nagar', '883d8b4497fffff', 25.1331, 75.8532, 'Opposite Allen Samyak, Rajeev Gandhi Nagar, Kota', 35, true, false, 'approved')
on conflict do nothing;
