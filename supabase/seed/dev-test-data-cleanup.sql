-- Removes exactly what dev-test-data.sql created (every id starts with `5eed`) and nothing else.
-- Notifications and memberships that point at seed plans go with the plans (cascade).
delete from public.moderation_queue where subject_id::text like '5eed%' or user_id::text like '5eed%';
delete from public.reports where id::text like '5eed%' or reporter_id::text like '5eed%' or target_user_id::text like '5eed%';
delete from public.ratings where plan_id::text like '5eed%';
delete from public.notifications where plan_id::text like '5eed%' or user_id::text like '5eed%';
delete from public.plans where id::text like '5eed%';
delete from auth.users where id::text like '5eed%';

select
  (select count(*) from auth.users where id::text like '5eed%') as seed_users_left,
  (select count(*) from public.plans where id::text like '5eed%') as seed_plans_left;
