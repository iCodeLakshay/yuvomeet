-- Local and staging seed: cities, colleges, venues. Never load into production.

insert into public.cities (id, name, slug, status, launch_date, center_lat, center_lng) values
  ('11111111-1111-4111-8111-111111111101', 'Kota', 'kota', 'live', '2026-10-24', 25.1825, 75.8391),
  ('11111111-1111-4111-8111-111111111102', 'Jaipur', 'jaipur', 'waitlist', null, 26.9124, 75.7873),
  ('11111111-1111-4111-8111-111111111103', 'Pune', 'pune', 'waitlist', null, 18.5204, 73.8567),
  ('11111111-1111-4111-8111-111111111104', 'Indore', 'indore', 'waitlist', null, 22.7196, 75.8577)
on conflict (slug) do nothing;

insert into public.colleges (id, city_id, name) values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', 'IIIT Kota'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101', 'Allen Career Institute'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111101', 'Resonance'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111101', 'Government Medical College Kota'),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111101', 'Career Point University')
on conflict do nothing;

insert into public.venues (id, city_id, name, area_name, area_cell, lat, lng, address_line, hours, capacity, partner, late_events_allowed, status, approved_at) values
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111101', 'Chai Sutta Bar', 'Vigyan Nagar', '883d8b4493fffff', 25.1483, 75.8442, 'Plot 14, Main Road, Vigyan Nagar', '{"all":{"open":"09:00","close":"22:30"}}', 30, true, true, 'approved', now()),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111101', 'Chambal Riverfront, Gate 3', 'Riverfront', '883d8b449ffffff', 25.1802, 75.8295, 'Promenade Plaza, Gate 3', '{"all":{"open":"06:00","close":"21:00"}}', 50, false, false, 'approved', now()),
  ('33333333-3333-4333-8333-333333333303', '11111111-1111-4111-8111-111111111101', 'Cafe Nirvana', 'Talwandi', '883d8b4491fffff', 25.1419, 75.8364, 'Sector 2 Circle, Talwandi', '{"all":{"open":"10:00","close":"22:00"}}', 24, true, true, 'approved', now()),
  ('33333333-3333-4333-8333-333333333304', '11111111-1111-4111-8111-111111111101', 'Roastery Coffee House', 'Talwandi', '883d8b4491fffff', 25.1398, 75.8380, 'Sector 4 Main Market, Talwandi', '{"all":{"open":"08:30","close":"21:00"}}', 28, true, false, 'approved', now()),
  ('33333333-3333-4333-8333-333333333305', '11111111-1111-4111-8111-111111111101', 'The Bookworm Study Lounge', 'Rajeev Gandhi Nagar', '883d8b4497fffff', 25.1331, 75.8532, 'Opposite Allen Samyak, Rajeev Gandhi Nagar', '{"all":{"open":"08:00","close":"21:00"}}', 35, true, false, 'approved', now())
on conflict do nothing;
