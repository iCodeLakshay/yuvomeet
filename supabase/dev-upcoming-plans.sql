-- Dev only: creates upcoming plans relative to now() so Discover is never empty.
-- Plans are short-lived (the lifecycle job completes them), so re-run this whenever the feed is
-- empty:  supabase db query --linked -f supabase/dev-upcoming-plans.sql   (or paste in the SQL editor)
-- Hosts are existing active, verified members of Kota. Do not run against production.
with hosts as (
  select id, row_number() over (order by created_at) as n
  from public.profiles
  where status = 'active' and verification_status = 'verified'
    and city_id = '11111111-1111-4111-8111-111111111101'
), venues as (
  select id, row_number() over (order by name) as n
  from public.venues where status = 'approved'
), spec(n, title, activity, hours_from_now, capacity) as (
  values
    (1, 'Evening chai and casual conversation', 'chai-cafe', 5, 6),
    (2, 'Board games night', 'board-games', 8, 8),
    (3, 'Sunset walk and talk', 'walk-talk', 26, 6),
    (4, 'Acoustic jam session', 'music-jam', 30, 8),
    (5, 'Weekend code and coffee', 'study-session', 50, 5),
    (6, 'Riverfront cricket', 'sports', 72, 10)
), made as (
  insert into public.plans (city_id, host_id, venue_id, title, activity, starts_at, ends_at, capacity, audience, requires_approval)
  select '11111111-1111-4111-8111-111111111101',
         (select id from hosts where n = (s.n - 1) % (select count(*) from hosts) + 1),
         (select id from venues where n = (s.n - 1) % (select count(*) from venues) + 1),
         s.title, s.activity,
         date_trunc('hour', now()) + make_interval(hours => s.hours_from_now),
         date_trunc('hour', now()) + make_interval(hours => s.hours_from_now + 2),
         s.capacity, 'everyone', true
  from spec s
  returning id, host_id, starts_at
), members as (
  insert into public.plan_members (plan_id, user_id, status, decided_at)
  select id, host_id, 'approved', now() from made
)
insert into public.conversations (kind, plan_id, closes_at)
select 'plan', id, starts_at + interval '26 hours' from made;

