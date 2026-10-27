-- Baseline configuration required in every environment.
-- Caps and windows: the SQL value is authoritative; packages/shared mirrors it for UI copy.

insert into private.settings (key, val) values
  ('free_joins_per_week', '2'),
  ('free_hosts_per_week', '1'),
  ('new_account_days', '7'),
  ('new_join_per_day', '5'),
  ('new_msg_per_day', '20'),
  ('max_msg_per_min', '30'),
  ('max_join_per_day', '20'),
  ('max_reports_per_day', '10'),
  ('auto_suspend_reports', '2'),
  ('plan_min_lead_hours', '3'),
  ('plan_cutoff_local', '21:00'),
  ('late_cancel_hours', '3'),
  ('chat_close_hours', '24'),
  ('checkin_radius_m', '150'),
  ('checkin_window_min', '30'),
  ('checkin_max_accuracy_m', '100'),
  ('otp_lock_max_fails', '5'),
  ('otp_lock_minutes', '30'),
  ('kyc_daily_cap', '300'),
  ('kyc_face_pass', '80'),
  ('kyc_face_review', '60'),
  ('rekognition_reject', '80'),
  ('rekognition_review', '50')
on conflict (key) do update set val = excluded.val, updated_at = now();

insert into private.screen_terms (term, lang, action) values
  ('hookup', 'en', 'hold'),
  ('fwb', 'en', 'hold'),
  ('nudes', 'en', 'hold'),
  ('nude', 'en', 'hold'),
  ('sexy', 'en', 'hold'),
  ('send pic', 'en', 'hold'),
  ('escort', 'en', 'hold'),
  ('sugar daddy', 'en', 'hold'),
  ('paid meet', 'en', 'hold'),
  ('room alone', 'en', 'hold'),
  ('private flat', 'en', 'hold'),
  ('weed', 'en', 'hold'),
  ('ganja', 'hinglish', 'hold'),
  ('charas', 'hinglish', 'hold'),
  ('chutiya', 'hinglish', 'hold'),
  ('madarchod', 'hinglish', 'reject'),
  ('bhenchod', 'hinglish', 'reject'),
  ('randi', 'hinglish', 'reject'),
  ('harami', 'hinglish', 'hold'),
  ('अश्लील', 'hi', 'hold'),
  ('सेक्स', 'hi', 'hold')
on conflict do nothing;

-- Icon names are Material Icons glyphs, shared with the app.
insert into public.activities (slug, label, icon, sort) values
  ('chai-cafe', 'Chai & Cafe', 'local-cafe', 1),
  ('study-session', 'Study Session', 'menu-book', 2),
  ('board-games', 'Board Games', 'casino', 3),
  ('walk-talk', 'Walk & Talk', 'directions-walk', 4),
  ('music-jam', 'Music & Jam', 'music-note', 5),
  ('sports', 'Sports', 'sports-cricket', 6),
  ('book-club', 'Book Club', 'auto-stories', 7),
  ('trek', 'Treks & Hiking', 'hiking', 8)
on conflict (slug) do nothing;

insert into public.interests (slug, label, icon, sort) values
  ('chai-cafe', 'Chai & Café', 'local-cafe', 1),
  ('study', 'Study Sessions', 'menu-book', 2),
  ('treks', 'Treks & Hiking', 'hiking', 3),
  ('sports', 'Sports', 'sports-basketball', 4),
  ('music', 'Music', 'music-note', 5),
  ('food', 'Food Exploring', 'restaurant', 6),
  ('games', 'Games', 'sports-esports', 7),
  ('photography', 'Photography', 'photo-camera', 8),
  ('movies', 'Movies', 'movie', 9),
  ('tech', 'Tech & Startups', 'computer', 10),
  ('fitness', 'Fitness', 'fitness-center', 11),
  ('art', 'Art & Creativity', 'brush', 12)
on conflict (slug) do nothing;
