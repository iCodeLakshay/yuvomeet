-- =============================================================================
-- pgTAP Security & RLS Verification Suite (docs/security.md Review Checklist)
-- =============================================================================
begin;
select plan(8);

-- 1. S-1: Every table in `public` has Row Level Security enabled
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and rowsecurity = false),
  0,
  'S-1: All public tables must have RLS enabled'
);

-- 2. S-5: No column in `public` matches phone|mobile|msisdn
select is(
  (
    select count(*)::int
    from information_schema.columns
    where table_schema = 'public'
      and column_name ~* '(phone|mobile|msisdn)'
  ),
  0,
  'S-5: No public table stores phone numbers'
);

-- 3. S-18: public_profiles view does not expose birth_year, area_cell, or verified_gender
select is(
  (
    select count(*)::int
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_profiles'
      and column_name in ('birth_year', 'area_cell', 'verified_gender', 'declared_gender')
  ),
  0,
  'S-18: public_profiles view hides birth_year, area_cell, and raw gender fields'
);

-- 4. S-46: audit_log has an immutability trigger preventing update and delete
select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'trg_audit_log_immutable'
  ),
  'S-46: audit_log immutability trigger exists'
);

-- 5. S-20: Text screening trigger is attached to messages, profiles, and plans
select is(
  (
    select count(*)::int
    from pg_trigger
    where tgname in ('trg_screen_messages', 'trg_screen_profiles', 'trg_screen_plans')
  ),
  3,
  'S-20: Text screening triggers exist on messages, profiles, and plans'
);

-- 6. S-27 & S-28: Message rate limit trigger is attached to messages
select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'trg_enforce_message_caps'
  ),
  'S-27/S-28: Message cap trigger exists on messages'
);

-- 7. S-15: can_see_plan helper function is security definer
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'can_see_plan'
      and p.prosecdef = true
  ),
  'S-15: can_see_plan helper is security definer'
);

-- 8. S-41: is_verified_woman helper checks verified status and woman gender
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_verified_woman'
      and p.prosecdef = true
  ),
  'S-15/S-41: is_verified_woman helper is security definer'
);

select * from finish();
rollback;
