-- Row level security, column grants and read views (docs/data-model.md RLS matrix).
--
-- Clients read other people only through definer views that expose allow-listed
-- columns (S-18). Base tables expose rows to their owner and admins only.

-- Default Supabase grants are too wide: start from nothing and grant explicitly.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS on every public table (S-1)
-- -----------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Lookups
-- -----------------------------------------------------------------------------
grant select on public.cities, public.interests, public.activities, public.colleges to authenticated;
create policy cities_read on public.cities for select to authenticated using (true);
create policy interests_read on public.interests for select to authenticated using (true);
create policy activities_read on public.activities for select to authenticated using (true);
create policy colleges_read on public.colleges for select to authenticated
  using (status = 'active' or app.is_admin());

grant select, delete on public.waitlist_signups to authenticated;
create policy waitlist_read on public.waitlist_signups for select to authenticated
  using (user_id = auth.uid() or app.is_admin());
create policy waitlist_delete on public.waitlist_signups for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- People: owner and admin only. Profile writes go through RPCs (S-35).
-- -----------------------------------------------------------------------------
grant select on public.profiles, public.profile_photos, public.profile_stats to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or app.is_admin());
create policy profile_photos_read on public.profile_photos for select to authenticated
  using (user_id = auth.uid() or app.is_admin());
create policy profile_stats_read on public.profile_stats for select to authenticated
  using (user_id = auth.uid() or app.is_admin());

grant select, insert on public.consents to authenticated;
create policy consents_read on public.consents for select to authenticated
  using (user_id = auth.uid() or app.is_admin());
create policy consents_insert on public.consents for insert to authenticated
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_tokens to authenticated;
create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- S-19: verification evidence is admin-only; users read their own verdicts via my_verification.
grant select on public.verification_checks to authenticated;
create policy verification_checks_admin on public.verification_checks for select to authenticated
  using (app.is_admin());

-- -----------------------------------------------------------------------------
-- Venues (S-14, SF-1)
-- -----------------------------------------------------------------------------
grant select on public.venues, public.venue_photos to authenticated;
create policy venues_read on public.venues for select to authenticated
  using (
    app.is_admin()
    or (status = 'approved' and city_id = (select p.city_id from public.profiles p where p.id = auth.uid()))
  );
create policy venue_photos_read on public.venue_photos for select to authenticated
  using (
    app.is_admin()
    or (status = 'approved' and exists (select 1 from public.venues v where v.id = venue_id and v.status = 'approved'))
  );

-- -----------------------------------------------------------------------------
-- Plans and membership. Writes through RPCs only.
-- -----------------------------------------------------------------------------
grant select on public.plans, public.plan_members, public.conversations, public.conversation_mutes to authenticated;
create policy plans_read on public.plans for select to authenticated
  using (app.can_see_plan(auth.uid(), id));

-- Own membership rows (Realtime status updates) plus host view of their plan.
create policy plan_members_read on public.plan_members for select to authenticated
  using (
    user_id = auth.uid()
    or app.is_admin()
    or exists (select 1 from public.plans pl where pl.id = plan_id and pl.host_id = auth.uid())
  );

create policy conversations_read on public.conversations for select to authenticated
  using (app.is_admin() or app.is_conversation_member(auth.uid(), id));
create policy conversation_mutes_read on public.conversation_mutes for select to authenticated
  using (user_id = auth.uid() or app.is_admin());

-- -----------------------------------------------------------------------------
-- Messages (CH-1, CH-3, S-17). Realtime applies these same policies.
-- -----------------------------------------------------------------------------
grant select on public.messages to authenticated;
grant insert (id, conversation_id, sender_id, body, image_path) on public.messages to authenticated;
create policy messages_read on public.messages for select to authenticated
  using (
    app.is_admin()
    or sender_id = auth.uid()
    or (
      status = 'visible'
      and app.is_conversation_member(auth.uid(), conversation_id)
      and not app.is_blocked_between(auth.uid(), sender_id)
    )
  );
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and app.is_verified(auth.uid())
    and image_path is null
    and exists (
      select 1
      from public.conversations c
      join public.plan_members pm on pm.plan_id = c.plan_id
      where c.id = conversation_id
        and c.status = 'open'
        and pm.user_id = auth.uid()
        and pm.status in ('approved', 'attended')
    )
    and not exists (
      select 1 from public.conversation_mutes cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Trust and safety (S-19)
-- -----------------------------------------------------------------------------
grant select on public.reports, public.blocks, public.ratings, public.moderation_queue,
  public.appeals, public.audit_log to authenticated;
grant delete on public.blocks to authenticated;
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = auth.uid() or app.is_admin());
create policy blocks_read on public.blocks for select to authenticated
  using (blocker_id = auth.uid() or app.is_admin());
create policy blocks_delete on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());
create policy ratings_read on public.ratings for select to authenticated using (app.is_admin());
create policy moderation_queue_read on public.moderation_queue for select to authenticated using (app.is_admin());
create policy appeals_read on public.appeals for select to authenticated
  using (user_id = auth.uid() or app.is_admin());
create policy audit_log_read on public.audit_log for select to authenticated
  using (app.is_full_admin() or (app.is_admin() and admin_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- Counters, exports, notifications
-- -----------------------------------------------------------------------------
grant select on public.usage_counters, public.data_exports to authenticated;
create policy usage_counters_read on public.usage_counters for select to authenticated
  using (user_id = auth.uid());
create policy data_exports_read on public.data_exports for select to authenticated
  using (user_id = auth.uid());

grant select on public.notifications to authenticated;
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Read views. Owned by postgres (definer rights), filtered on auth.uid().
-- -----------------------------------------------------------------------------

-- S-18: the only way to read another user. No birth year, gender, or area cell.
create view public.public_profiles
with (security_barrier = true)
as
select
  p.id,
  p.first_name,
  app.age_band(p.birth_year) as age_band,
  (p.verification_status = 'verified') as is_verified,
  case when p.bio_status = 'visible' then p.bio end as bio,
  p.interests,
  p.languages,
  p.area_name,
  c.name as college_name,
  coalesce(
    (select array_agg(ph.path order by ph.position)
     from public.profile_photos ph
     where ph.user_id = p.id and ph.status = 'approved' and ph.path is not null),
    '{}'
  ) as photo_paths,
  coalesce(ps.plans_attended, 0) as plans_attended,
  coalesce(ps.plans_hosted, 0) as plans_hosted,
  case
    when coalesce(ps.plans_attended, 0) + coalesce(ps.plans_no_show, 0) >= 3
    then round(ps.plans_attended::numeric * 100 / (ps.plans_attended + ps.plans_no_show))::int
  end as show_up_rate
from public.profiles p
left join public.colleges c on c.id = p.college_id
left join public.profile_stats ps on ps.user_id = p.id
where app.can_view_profile(auth.uid(), p.id);

-- Architecture §Feed: plan card payload. Callers filter status and time window.
create view public.plan_cards
with (security_barrier = true)
as
select
  pl.id,
  pl.city_id,
  pl.host_id,
  hp.first_name as host_first_name,
  (hp.verification_status = 'verified') as host_verified,
  app.age_band(hp.birth_year) as host_age_band,
  hc.name as host_college,
  (select ph.path from public.profile_photos ph
   where ph.user_id = pl.host_id and ph.status = 'approved' and ph.path is not null
   order by ph.position limit 1) as host_photo_path,
  coalesce(hps.plans_hosted, 0) as host_plans_hosted,
  coalesce(hps.late_cancel_count_30d, 0) as host_late_cancels_30d,
  pl.venue_id,
  v.name as venue_name,
  v.area_name as venue_area_name,
  v.address_line as venue_address,
  v.partner as venue_partner,
  v.lat as venue_lat,
  v.lng as venue_lng,
  (select vp.path from public.venue_photos vp
   where vp.venue_id = v.id and vp.status = 'approved'
   order by vp.position limit 1) as cover_path,
  pl.title,
  pl.description,
  pl.activity,
  pl.starts_at,
  pl.ends_at,
  pl.capacity,
  pl.approved_count,
  pl.audience,
  pl.requires_approval,
  pl.status,
  pl.late_cancel,
  pl.cancel_reason,
  (select pm.status from public.plan_members pm
   where pm.plan_id = pl.id and pm.user_id = auth.uid()) as my_status,
  (select pm.checked_in_at from public.plan_members pm
   where pm.plan_id = pl.id and pm.user_id = auth.uid()) as my_checked_in_at,
  (select c.id from public.conversations c where c.plan_id = pl.id) as conversation_id,
  coalesce(
    (select array_agg(sub.first_name order by sub.decided_at)
     from (
       select mp.first_name, pm.decided_at
       from public.plan_members pm
       join public.profiles mp on mp.id = pm.user_id
       where pm.plan_id = pl.id
         and pm.status in ('approved', 'attended')
         and not app.is_blocked_between(auth.uid(), pm.user_id)
       order by pm.decided_at
       limit 4
     ) sub),
    '{}'
  ) as member_names
from public.plans pl
join public.profiles hp on hp.id = pl.host_id
left join public.colleges hc on hc.id = hp.college_id
left join public.profile_stats hps on hps.user_id = pl.host_id
join public.venues v on v.id = pl.venue_id
where app.can_see_plan(auth.uid(), pl.id);

-- CH-1: co-member list. Visible to members and the host; blocked pairs hidden (S-17).
create view public.plan_roster
with (security_barrier = true)
as
select
  pm.plan_id,
  pm.user_id,
  p.first_name,
  (select ph.path from public.profile_photos ph
   where ph.user_id = pm.user_id and ph.status = 'approved' and ph.path is not null
   order by ph.position limit 1) as photo_path,
  (p.verification_status = 'verified') as is_verified,
  (pl.host_id = pm.user_id) as is_host,
  pm.status,
  (pm.checked_in_at is not null) as checked_in
from public.plan_members pm
join public.plans pl on pl.id = pm.plan_id
join public.profiles p on p.id = pm.user_id
where pm.status in ('approved', 'attended', 'no_show')
  and (app.is_plan_member(auth.uid(), pm.plan_id) or pl.host_id = auth.uid() or app.is_admin())
  and not app.is_blocked_between(auth.uid(), pm.user_id);

-- PL-3: what a host sees about requesters. No-shows sort last (moderation doc).
create view public.join_requests
with (security_barrier = true)
as
select
  pm.plan_id,
  pm.user_id,
  p.first_name,
  app.age_band(p.birth_year) as age_band,
  (p.verification_status = 'verified') as is_verified,
  p.interests,
  (select ph.path from public.profile_photos ph
   where ph.user_id = pm.user_id and ph.status = 'approved' and ph.path is not null
   order by ph.position limit 1) as photo_path,
  coalesce(ps.plans_attended, 0) as plans_attended,
  case
    when coalesce(ps.plans_attended, 0) + coalesce(ps.plans_no_show, 0) >= 3
    then round(ps.plans_attended::numeric * 100 / (ps.plans_attended + ps.plans_no_show))::int
  end as show_up_rate,
  (coalesce(ps.plans_no_show, 0) >= 3) as low_priority,
  pm.note,
  pm.status,
  pm.requested_at
from public.plan_members pm
join public.plans pl on pl.id = pm.plan_id
join public.profiles p on p.id = pm.user_id
left join public.profile_stats ps on ps.user_id = pm.user_id
where pl.host_id = auth.uid()
  and pm.user_id <> pl.host_id
  and pm.status in ('requested', 'approved', 'declined')
  and not app.is_blocked_between(auth.uid(), pm.user_id);

-- Own verification verdicts without evidence (S-19, S-47).
create view public.my_verification
with (security_barrier = true)
as
select vc.id, vc.type, vc.verdict, vc.attempt, vc.decided_at, vc.created_at
from public.verification_checks vc
where vc.user_id = auth.uid();

-- CH-4: own block list with display names.
create view public.my_blocks
with (security_barrier = true)
as
select b.blocked_id, p.first_name, b.created_at
from public.blocks b
join public.profiles p on p.id = b.blocked_id
where b.blocker_id = auth.uid();

-- CH-1: chat list with the latest visible message (respects blocks and holds).
create view public.my_chats
with (security_barrier = true)
as
select
  c.id as conversation_id,
  c.plan_id,
  c.status,
  c.closes_at,
  pl.title,
  pl.starts_at,
  pl.approved_count,
  v.name as venue_name,
  (select vp.path from public.venue_photos vp
   where vp.venue_id = v.id and vp.status = 'approved' order by vp.position limit 1) as cover_path,
  lm.body as last_body,
  lm.image_path is not null as last_is_photo,
  lm.created_at as last_at,
  lp.first_name as last_sender_name,
  (lm.sender_id = auth.uid()) as last_is_mine
from public.conversations c
join public.plans pl on pl.id = c.plan_id
join public.venues v on v.id = pl.venue_id
left join lateral (
  select m.body, m.image_path, m.created_at, m.sender_id
  from public.messages m
  where m.conversation_id = c.id
    and (m.status = 'visible' or m.sender_id = auth.uid())
    and not app.is_blocked_between(auth.uid(), m.sender_id)
  order by m.created_at desc
  limit 1
) lm on true
left join public.profiles lp on lp.id = lm.sender_id
where app.is_conversation_member(auth.uid(), c.id);

grant select on public.public_profiles, public.plan_cards, public.plan_roster,
  public.join_requests, public.my_verification, public.my_blocks, public.my_chats to authenticated;
