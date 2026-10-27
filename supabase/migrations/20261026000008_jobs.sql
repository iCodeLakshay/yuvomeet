-- Time-driven jobs (architecture.md §Plan lifecycle, privacy §3, moderation SLAs).

-- Every 5 minutes. User-driven transitions (full, cancelled) happen in RPCs.
create function private.plan_lifecycle_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  update public.plans set status = 'started'
  where status in ('open', 'full') and starts_at <= now();

  -- Completed plans: checked-in members attended, others no-show. The host always attends.
  with done as (
    update public.plans set status = 'completed'
    where status = 'started' and ends_at <= now()
    returning id, host_id
  ), marked as (
    update public.plan_members pm
    set status = case when pm.checked_in_at is not null or pm.user_id = d.host_id
      then 'attended' else 'no_show' end::public.member_status
    from done d
    where pm.plan_id = d.id and pm.status = 'approved'
    returning pm.plan_id, pm.user_id, pm.status, (pm.user_id = d.host_id) as is_host
  ), tracked as (
    -- plan_completed is a server-side event (implementation-plan §Analytics). A data-modifying
    -- CTE always runs, unlike a SELECT one.
    insert into private.analytics_outbox (event, distinct_id, city_slug, props)
    select 'plan_completed', d.host_id, coalesce(c.slug, 'unknown'), jsonb_build_object(
      'plan_id', d.id,
      'attended_count', (select count(*) from marked m where m.plan_id = d.id and m.status = 'attended'))
    from done d
    join public.plans pl on pl.id = d.id
    left join public.cities c on c.id = pl.city_id
    where d.host_id is not null
  ), member_stats as (
    update public.profile_stats ps
    set plans_attended = ps.plans_attended + s.attended,
        plans_no_show = ps.plans_no_show + s.no_show
    from (
      select user_id,
        count(*) filter (where status = 'attended' and not is_host) as attended,
        count(*) filter (where status = 'no_show') as no_show
      from marked group by user_id
    ) s
    where ps.user_id = s.user_id
  )
  update public.profile_stats ps set plans_hosted = ps.plans_hosted + h.n
  from (select host_id, count(*) as n from done where host_id is not null group by host_id) h
  where ps.user_id = h.host_id;

  -- Pending requests on plans that will not happen expire and return the weekly slot (S-25).
  for r in
    select pm.plan_id, pm.user_id, pl.starts_at
    from public.plan_members pm join public.plans pl on pl.id = pm.plan_id
    where pm.status = 'requested' and pl.status in ('started', 'completed', 'cancelled')
  loop
    update public.plan_members set status = 'expired' where plan_id = r.plan_id and user_id = r.user_id;
    perform private.return_join_slot(r.user_id, r.starts_at);
  end loop;

  -- CH-1: read-only 24 h after the plan, later if held open for a report.
  update public.conversations set status = 'closed'
  where status = 'open' and closes_at <= now() and (hold_until is null or hold_until <= now());
end;
$$;

-- SF-4: prompt attended members about 1 hour after the plan ends.
create function private.rating_prompt_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pl record;
begin
  for pl in
    update public.plans set rating_prompted_at = now()
    where status = 'completed' and rating_prompted_at is null
      and ends_at <= now() - interval '1 hour' and ends_at > now() - interval '7 days'
    returning id, title, host_id
  loop
    insert into public.notifications (user_id, category, kind, title, body, plan_id)
    select pm.user_id, 'plan', 'rating_prompt', 'How was ' || pl.title || '?',
      'Tell us privately if you felt safe and who showed up.', pl.id
    from public.plan_members pm
    where pm.plan_id = pl.id and pm.status = 'attended'
      and (select count(*) from public.plan_members o where o.plan_id = pl.id and o.status in ('attended', 'no_show')) > 1;
  end loop;
end;
$$;

-- Daily 03:00 IST. Deletion purge, message retention, 30-day stats.
create function private.retention_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j record;
begin
  for j in
    select dj.user_id from private.deletion_jobs dj
    where dj.completed_at is null and dj.purge_after <= now()
  loop
    -- Group threads stay readable; the content goes (privacy §3).
    update public.messages set body = 'Message removed', image_path = null, image_status = null
    where sender_id = j.user_id;
    -- Fingerprints are kept only for banned and minor accounts.
    delete from private.identity_fingerprints
    where user_id = j.user_id and not is_banned and not is_minor;
    update private.identity_fingerprints set user_id = null where user_id = j.user_id;
    update private.deletion_jobs set completed_at = now() where user_id = j.user_id;
    delete from auth.users where id = j.user_id;
  end loop;

  -- Plan chats: messages deleted 90 days after close unless tied to an open report.
  delete from public.messages m
  using public.conversations c
  where m.conversation_id = c.id
    and c.status = 'closed'
    and c.closes_at < now() - interval '90 days'
    and not exists (
      select 1 from public.reports r
      where r.status = 'open' and (r.message_id = m.id or r.plan_id = c.plan_id)
    );

  delete from public.data_exports where expires_at <= now();
  delete from public.notifications where created_at < now() - interval '90 days';
  delete from private.edge_rate where window_start < now() - interval '2 days';
  delete from private.webhook_events where received_at < now() - interval '7 days';
  delete from private.analytics_outbox where created_at < now() - interval '7 days';

  update public.profile_stats ps set
    late_cancel_count_30d = (
      select count(*) from public.plans pl
      where pl.host_id = ps.user_id and pl.late_cancel and pl.cancelled_at >= now() - interval '30 days'),
    unsafe_ratings_30d = (
      select count(*) from public.ratings r
      where r.ratee_id = ps.user_id and not r.felt_safe and r.created_at >= now() - interval '30 days'),
    reports_received_30d = (
      select count(*) from public.reports r
      where r.target_user_id = ps.user_id and r.created_at >= now() - interval '30 days');
end;
$$;

-- Every 15 minutes. SLA alerts (PRD NFR: oldest item > 24 h; severe re-page at 8 h).
create function private.queue_age_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oldest timestamptz;
  r record;
begin
  update public.moderation_queue set status = 'pending', assigned_to = null, assigned_at = null
  where status = 'in_review' and assigned_at < now() - interval '30 minutes';

  select min(created_at) into v_oldest from public.moderation_queue where status in ('pending', 'in_review');
  if v_oldest < now() - interval '24 hours' then
    perform private.alert('queue_age', jsonb_build_object('oldest', v_oldest));
  end if;

  for r in
    update public.moderation_queue set alerted_at = now()
    where severity = 'severe' and status in ('pending', 'in_review', 'escalated')
      and alerted_at is null and created_at < now() - interval '8 hours'
    returning id, subject
  loop
    perform private.alert('severe_pending_8h', jsonb_build_object('item_id', r.id, 'subject', r.subject));
  end loop;
end;
$$;

select cron.schedule('plan_lifecycle_tick', '*/5 * * * *', 'select private.plan_lifecycle_tick()');
select cron.schedule('rating_prompt_tick', '*/5 * * * *', 'select private.rating_prompt_tick()');
select cron.schedule('queue_age_tick', '*/15 * * * *', 'select private.queue_age_tick()');
select cron.schedule('retention_tick', '30 21 * * *', 'select private.retention_tick()');
select cron.schedule('analytics_flush', '*/5 * * * *',
  $$select private.call_function('analytics-flush', '{}'::jsonb) where exists (select 1 from private.analytics_outbox)$$);
