-- Security and performance hardening (advisor findings of 2026-11-02).
--
-- 1. Signed-out callers could execute client RPCs and every admin_* RPC. Each one already
--    rejected them at runtime (require_uid / require_admin); this removes the grant so the
--    check is enforced twice. svc_* stay service-role only.
-- 2. custom_access_token is an Auth hook, not an API: only supabase_auth_admin may call it.
--    Before this, anyone could ask it whether a user id is an admin.
-- 3. RLS policies call auth.uid() / auth.jwt() once per statement instead of once per row.
-- 4. Covering indexes for foreign keys (deletes and joins on these columns scanned tables).
-- 5. message_mentions had RLS with no policy; members can now read their own mentions.

-- -----------------------------------------------------------------------------
-- 1. Function grants: authenticated only, never anon / PUBLIC
-- -----------------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.proname not like 'svc\_%' and f.proname <> 'custom_access_token' then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end;
$$;

-- New functions created by postgres in public start without PUBLIC execute.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- -----------------------------------------------------------------------------
-- 2. Auth hook: callable by Supabase Auth only
-- -----------------------------------------------------------------------------
revoke execute on function public.custom_access_token(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token(jsonb) to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- 3. RLS: evaluate auth.uid() / auth.jwt() once per statement (initplan)
-- -----------------------------------------------------------------------------
create function pg_temp.wrap_calls(p_expr text)
returns text
language plpgsql
as $$
declare
  -- Zero-argument, per-statement-constant calls. app.is_admin() reads only the JWT.
  v_calls text[] := array['auth.uid()', 'auth.jwt()', 'app.is_admin()', 'app.is_full_admin()'];
  v_aliases text[] := array['uid', 'jwt', 'is_admin', 'is_full_admin'];
  v_out text := p_expr;
begin
  if v_out is null then
    return null;
  end if;
  for i in 1 .. array_length(v_calls, 1) loop
    -- Protect calls Postgres already shows as wrapped, wrap the rest, then restore.
    v_out := replace(v_out, format('( SELECT %s AS %s)', v_calls[i], v_aliases[i]), format('@@%s@@', i));
    v_out := replace(v_out, v_calls[i], format('(select %s)', v_calls[i]));
    v_out := replace(v_out, format('@@%s@@', i), format('(select %s)', v_calls[i]));
  end loop;
  return v_out;
end;
$$;

do $$
declare
  r record;
  v_using text;
  v_check text;
  v_sql text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') || coalesce(with_check, '')) ~ '(auth\.(uid|jwt)|app\.is_(full_)?admin)\(\)'
  loop
    v_using := pg_temp.wrap_calls(r.qual);
    v_check := pg_temp.wrap_calls(r.with_check);

    v_sql := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if v_using is not null then
      v_sql := v_sql || format(' using (%s)', v_using);
    end if;
    if v_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;
    execute v_sql;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Foreign key covering indexes
-- -----------------------------------------------------------------------------
create index if not exists admin_roles_granted_by_idx on private.admin_roles (granted_by);
create index if not exists identity_fingerprints_user_id_idx on private.identity_fingerprints (user_id);
create index if not exists kyc_sessions_user_id_idx on private.kyc_sessions (user_id);
create index if not exists appeals_user_id_idx on public.appeals (user_id);
create index if not exists appeals_decided_by_idx on public.appeals (decided_by);
create index if not exists audit_log_admin_id_idx on public.audit_log (admin_id);
create index if not exists colleges_city_id_idx on public.colleges (city_id);
create index if not exists consents_user_id_created_idx on public.consents (user_id, created_at);
create index if not exists conversation_mutes_user_id_idx on public.conversation_mutes (user_id);
create index if not exists data_exports_user_id_idx on public.data_exports (user_id);
create index if not exists friendships_requester_id_idx on public.friendships (requester_id);
create index if not exists host_payouts_host_id_idx on public.host_payouts (host_id);
create index if not exists host_payouts_paid_by_idx on public.host_payouts (paid_by);
create index if not exists message_hides_message_id_idx on public.message_hides (message_id);
create index if not exists message_mentions_user_id_idx on public.message_mentions (user_id);
create index if not exists message_reactions_user_id_idx on public.message_reactions (user_id);
create index if not exists messages_reply_to_idx on public.messages (reply_to);
create index if not exists moderation_queue_assigned_to_idx on public.moderation_queue (assigned_to);
create index if not exists moderation_queue_decided_by_idx on public.moderation_queue (decided_by);
create index if not exists notifications_actor_id_idx on public.notifications (actor_id);
create index if not exists notifications_conversation_id_idx on public.notifications (conversation_id);
create index if not exists notifications_plan_id_idx on public.notifications (plan_id);
create index if not exists plans_activity_idx on public.plans (activity);
create index if not exists plans_college_id_idx on public.plans (college_id);
create index if not exists plans_cover_id_idx on public.plans (cover_id);
create index if not exists plans_venue_id_idx on public.plans (venue_id);
create index if not exists profiles_college_id_idx on public.profiles (college_id);
create index if not exists ratings_rater_id_idx on public.ratings (rater_id);
create index if not exists reports_message_id_idx on public.reports (message_id);
create index if not exists reports_plan_id_idx on public.reports (plan_id);
create index if not exists venue_photos_venue_id_idx on public.venue_photos (venue_id);
create index if not exists venues_approved_by_idx on public.venues (approved_by);
create index if not exists verification_checks_reviewer_id_idx on public.verification_checks (reviewer_id);
create index if not exists waitlist_signups_city_id_idx on public.waitlist_signups (city_id);

-- -----------------------------------------------------------------------------
-- 5. Mentions: written only by notify_mentions; members read their own
-- -----------------------------------------------------------------------------
grant select on public.message_mentions to authenticated;
create policy message_mentions_read_own on public.message_mentions for select to authenticated
  using (user_id = (select auth.uid()));
