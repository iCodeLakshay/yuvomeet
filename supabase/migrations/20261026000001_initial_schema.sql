-- =============================================================================
-- Yuvomeet P0 Schema, RLS Matrix, Helper Functions, RPCs, Triggers & Cron Jobs
-- Region: ap-south-1 (Mumbai)
-- Enforces S-1 through S-54 in docs/security.md and docs/data-model.md
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
create type public.city_status as enum ('waitlist', 'beta', 'live');
create type public.profile_status as enum ('onboarding', 'active', 'suspended', 'banned', 'deleted');
create type public.gender as enum ('woman', 'man', 'other');
create type public.verification_status as enum ('unverified', 'pending', 'manual_review', 'verified', 'rejected', 'blocked_minor');
create type public.check_type as enum ('id_age', 'liveness_face', 'gender');
create type public.verdict as enum ('pass', 'fail', 'review', 'minor');
create type public.media_status as enum ('pending', 'approved', 'rejected');
create type public.plan_audience as enum ('everyone', 'women_only', 'same_college');
create type public.plan_status as enum ('open', 'full', 'started', 'completed', 'cancelled');
create type public.member_status as enum ('requested', 'approved', 'declined', 'withdrawn', 'left', 'removed', 'expired', 'attended', 'no_show');
create type public.conversation_kind as enum ('plan', 'pair');
create type public.conversation_status as enum ('open', 'closed');
create type public.content_status as enum ('visible', 'held', 'rejected');
create type public.report_reason as enum ('harassment', 'sexual_content', 'threat_or_violence', 'fake_profile', 'underage', 'spam_or_scam', 'no_show', 'unsafe_at_plan', 'other');
create type public.report_severity as enum ('severe', 'standard');
create type public.report_status as enum ('open', 'actioned', 'dismissed');
create type public.queue_subject as enum ('photo', 'text', 'verification', 'report', 'rating_review', 'venue', 'appeal');
create type public.queue_status as enum ('pending', 'in_review', 'approved', 'rejected', 'escalated');
create type public.appeal_subject as enum ('verification', 'suspension', 'content', 'ban');
create type public.appeal_status as enum ('open', 'upheld', 'denied');
create type public.entitlement as enum ('free', 'plus', 'premium');
create type public.consent_purpose as enum ('location', 'camera', 'notifications', 'community_rules', 'terms_privacy');

-- -----------------------------------------------------------------------------
-- 2. Private Tables (S-3: Never exposed via PostgREST)
-- -----------------------------------------------------------------------------
create table private.settings (
  key text primary key,
  val text not null,
  updated_at timestamptz not null default now()
);

create table private.otp_attempts (
  identifier_hmac text primary key,
  failed_count int not null default 0,
  locked_until timestamptz null,
  updated_at timestamptz not null default now()
);

create table private.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('reviewer', 'admin')),
  granted_by uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

create table private.screen_terms (
  term text not null,
  lang text not null default 'en',
  action text not null check (action in ('reject', 'hold')),
  primary key (term, lang)
);

create table private.media_moderation (
  sha256 text primary key,
  verdict public.verdict not null,
  labels jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default now()
);

create table private.identity_fingerprints (
  fingerprint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_minor boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table private.kyc_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  check_type public.check_type not null,
  verdict public.verdict not null,
  score numeric null,
  updated_at timestamptz not null default now(),
  primary key (user_id, check_type)
);

create table private.webhook_events (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table private.edge_rate (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (user_id, endpoint, window_start)
);

create table private.vendor_usage (
  vendor text not null,
  day date not null,
  units int not null default 0,
  primary key (vendor, day)
);

create table private.deletion_jobs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null,
  completed_at timestamptz null
);

-- -----------------------------------------------------------------------------
-- 3. Public Tables (S-1: Every public table has RLS enabled, S-5: No phone col)
-- -----------------------------------------------------------------------------
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.city_status not null default 'waitlist',
  launch_date date null,
  timezone text not null default 'Asia/Kolkata',
  center_lat double precision not null,
  center_lng double precision not null,
  created_at timestamptz not null default now()
);

create table public.waitlist_signups (
  user_id uuid not null references auth.users(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now()
);

create table public.interests (
  slug text primary key,
  label_en text not null,
  label_hi text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.activities (
  slug text primary key,
  label_en text not null,
  label_hi text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  city_id uuid null references public.cities(id),
  first_name text not null default '' check (char_length(first_name) <= 30),
  birth_year smallint null,
  declared_gender public.gender not null default 'other',
  verified_gender public.gender null,
  bio text null check (bio is null or char_length(bio) <= 300),
  bio_status public.content_status not null default 'visible',
  interests text[] not null default '{}',
  languages text[] not null default '{en}',
  area_cell text not null default '',
  area_name text not null default '',
  college_id uuid null references public.colleges(id),
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz null,
  status public.profile_status not null default 'onboarding',
  status_reason text null,
  entitlement public.entitlement not null default 'free',
  locale text not null default 'en' check (locale in ('en', 'hi')),
  rules_accepted_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  path text null,
  quarantine_path text not null,
  sha256 text not null,
  position smallint not null check (position between 0 and 5),
  status public.media_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plans_attended int not null default 0,
  plans_no_show int not null default 0,
  plans_hosted int not null default 0,
  late_cancel_count_30d int not null default 0,
  unsafe_ratings_30d int not null default 0,
  reports_received_30d int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose public.consent_purpose not null,
  granted boolean not null,
  policy_version text not null default '2026-10',
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table public.verification_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.check_type not null,
  provider text not null default 'hyperverge',
  provider_ref text not null,
  ai_score numeric null,
  verdict public.verdict not null,
  evidence jsonb not null default '{}'::jsonb,
  reviewer_id uuid null references auth.users(id),
  decided_at timestamptz null,
  attempt smallint not null default 1,
  created_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  name text not null,
  area_name text not null,
  area_cell text not null,
  lat double precision not null,
  lng double precision not null,
  address_line text not null,
  hours jsonb not null default '{}'::jsonb,
  capacity int not null default 20,
  partner boolean not null default false,
  late_events_allowed boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  approved_by uuid null references auth.users(id),
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  path text not null,
  position smallint not null default 0,
  status public.media_status not null default 'approved',
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id),
  host_id uuid not null references public.profiles(id),
  venue_id uuid not null references public.venues(id),
  title text not null check (char_length(title) between 3 and 60),
  description text null check (description is null or char_length(description) <= 500),
  activity text not null references public.activities(slug),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity smallint not null check (capacity between 3 and 10),
  approved_count smallint not null default 1,
  audience public.plan_audience not null default 'everyone',
  college_id uuid null references public.colleges(id),
  price_paise int null,
  status public.plan_status not null default 'open',
  late_cancel boolean not null default false,
  cancel_reason text null,
  cancelled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_members (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.member_status not null default 'requested',
  requested_at timestamptz not null default now(),
  decided_at timestamptz null,
  checked_in_at timestamptz null,
  note text null check (note is null or char_length(note) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'plan',
  plan_id uuid null unique references public.plans(id) on delete cascade,
  user_a uuid null references public.profiles(id),
  user_b uuid null references public.profiles(id),
  status public.conversation_status not null default 'open',
  opened_at timestamptz not null default now(),
  closes_at timestamptz not null,
  hold_until timestamptz null,
  pair_unmask_at timestamptz null,
  created_at timestamptz not null default now()
);

create table public.conversation_mutes (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text null check (body is null or char_length(body) <= 1000),
  image_path text null,
  image_status public.media_status null,
  status public.content_status not null default 'visible',
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  constraint message_body_or_image check (body is not null or image_path is not null)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id),
  callee_id uuid not null references public.profiles(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  duration_s int not null default 0,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_user_id uuid not null references public.profiles(id),
  plan_id uuid null references public.plans(id),
  message_id uuid null references public.messages(id),
  reason public.report_reason not null,
  severity public.report_severity not null,
  details text not null default '' check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create table public.ratings (
  plan_id uuid not null references public.plans(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  ratee_id uuid not null references public.profiles(id) on delete cascade,
  felt_safe boolean not null,
  showed_up boolean not null,
  created_at timestamptz not null default now(),
  primary key (plan_id, rater_id, ratee_id)
);

create table public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  subject public.queue_subject not null,
  subject_id uuid not null,
  user_id uuid not null references public.profiles(id),
  severity public.report_severity not null default 'standard',
  ai_verdict public.verdict null,
  ai_score numeric null,
  ai_labels jsonb not null default '[]'::jsonb,
  status public.queue_status not null default 'pending',
  assigned_to uuid null references auth.users(id),
  decision_reason text null,
  decided_by uuid null references auth.users(id),
  decided_at timestamptz null,
  due_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject public.appeal_subject not null,
  subject_id uuid not null,
  message text not null check (char_length(message) <= 1000),
  status public.appeal_status not null default 'open',
  response text null,
  decided_by uuid null references auth.users(id),
  decided_at timestamptz null,
  due_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users(id),
  action text not null,
  subject_type text not null,
  subject_id uuid not null,
  reason text not null check (char_length(trim(reason)) > 0),
  before jsonb null,
  after jsonb null,
  created_at timestamptz not null default now()
);

create table public.usage_counters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('join_week', 'host_week', 'join_day', 'message_day', 'report_day')),
  period_start date not null,
  count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, period_start)
);

create table public.data_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  path text not null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. Indexes (docs/data-model.md)
-- -----------------------------------------------------------------------------
create index idx_plans_feed on public.plans (city_id, status, starts_at, id);
create index idx_plans_activity on public.plans (city_id, activity, starts_at) where status in ('open', 'full');
create index idx_plans_host on public.plans (host_id, starts_at desc);
create index idx_plans_status_starts on public.plans (status, starts_at);
create index idx_plans_status_ends on public.plans (status, ends_at);
create index idx_plan_members_user on public.plan_members (user_id, status);
create index idx_plan_members_plan on public.plan_members (plan_id, status);
create index idx_messages_conversation on public.messages (conversation_id, created_at desc, id);
create index idx_messages_sender_rate on public.messages (sender_id, created_at);
create index idx_conversations_close on public.conversations (status, closes_at);
create index idx_conversations_plan on public.conversations (plan_id);
create index idx_blocks_reverse on public.blocks (blocked_id, blocker_id);
create index idx_reports_target on public.reports (target_user_id, created_at);
create index idx_ratings_unsafe on public.ratings (ratee_id, created_at) where felt_safe = false;
create index idx_queue_sla on public.moderation_queue (status, severity, due_at);
create index idx_appeals_sla on public.appeals (status, due_at);
create index idx_venues_city on public.venues (city_id, status);
create index idx_profile_photos_user on public.profile_photos (user_id, position);
create index idx_profiles_city on public.profiles (city_id, status);
create index idx_profiles_name_trgm on public.profiles using gin (first_name gin_trgm_ops);
create index idx_audit_subject on public.audit_log (subject_type, subject_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Security Helper Functions (S-4: security definer, search_path = '')
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'app_role') in ('reviewer', 'admin')
    and (auth.jwt() ->> 'aal') = 'aal2',
    false
  );
$$;

create or replace function public.is_full_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'app_role') = 'admin'
    and (auth.jwt() ->> 'aal') = 'aal2',
    false
  );
$$;

create or replace function public.is_active(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.status = 'active'
      and (
        select count(*)
        from public.profile_photos pp
        where pp.user_id = uid
          and pp.status = 'approved'
      ) >= 2
  );
$$;

create or replace function public.is_verified(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.status = 'active'
      and p.verification_status = 'verified'
  );
$$;

create or replace function public.is_verified_woman(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.status = 'active'
      and p.verification_status = 'verified'
      and p.verified_gender = 'woman'
  );
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

create or replace function public.can_see_plan(uid uuid, target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.plans pl
    join public.profiles caller on caller.id = uid
    where pl.id = target_plan_id
      and (
        public.is_admin()
        or pl.host_id = uid
        or (
          caller.status = 'active'
          and pl.city_id = caller.city_id
          and not public.is_blocked_between(uid, pl.host_id)
          and (
            pl.audience = 'everyone'
            or (pl.audience = 'women_only' and public.is_verified_woman(uid))
            or (pl.audience = 'same_college' and pl.college_id is not null and pl.college_id = caller.college_id)
          )
        )
      )
  );
$$;

-- S-43: Custom access token hook for admin JWT claims
create or replace function public.custom_access_token(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  user_role text;
begin
  select ar.role into user_role
  from private.admin_roles ar
  where ar.user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  if user_role is not null then
    claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Views (S-18: public_profiles, Architecture §Feed: feed_plans)
-- -----------------------------------------------------------------------------
create or replace view public.public_profiles
with (security_invoker = on)
as
select
  p.id,
  p.city_id,
  p.first_name,
  case
    when p.birth_year is null then '18–20'
    when (extract(year from now()) - p.birth_year) <= 20 then '18–20'
    when (extract(year from now()) - p.birth_year) <= 24 then '21–24'
    when (extract(year from now()) - p.birth_year) <= 30 then '25–30'
    else '30+'
  end as age_band,
  (p.verification_status = 'verified') as is_verified,
  case when p.bio_status = 'visible' then p.bio else null end as bio,
  p.interests,
  p.languages,
  p.area_name,
  c.name as college_name,
  coalesce(ps.plans_attended, 0) as plans_attended,
  coalesce(ps.plans_hosted, 0) as plans_hosted,
  case
    when coalesce(ps.plans_attended, 0) + coalesce(ps.plans_no_show, 0) >= 3
    then round((ps.plans_attended::numeric / nullif(ps.plans_attended + ps.plans_no_show, 0)) * 100)
    else null
  end as show_up_rate
from public.profiles p
left join public.colleges c on c.id = p.college_id
left join public.profile_stats ps on ps.user_id = p.id
where p.status = 'active'
  and not public.is_blocked_between(auth.uid(), p.id);

create or replace view public.feed_plans
with (security_invoker = on)
as
select
  pl.id,
  pl.city_id,
  pl.host_id,
  hp.first_name as host_first_name,
  (hp.verification_status = 'verified') as host_verified,
  coalesce(hps.plans_hosted, 0) as host_plans_hosted,
  coalesce(hps.late_cancel_count_30d, 0) as host_late_cancels_30d,
  v.id as venue_id,
  v.name as venue_name,
  v.area_name as venue_area_name,
  v.address_line as venue_address,
  v.partner as venue_partner,
  v.lat as venue_lat,
  v.lng as venue_lng,
  pl.title,
  pl.description,
  pl.activity,
  pl.starts_at,
  pl.ends_at,
  pl.capacity,
  pl.approved_count,
  pl.audience,
  pl.college_id,
  pl.status
from public.plans pl
join public.profiles hp on hp.id = pl.host_id
left join public.profile_stats hps on hps.user_id = pl.host_id
join public.venues v on v.id = pl.venue_id
where pl.status in ('open', 'full')
  and public.can_see_plan(auth.uid(), pl.id);

-- -----------------------------------------------------------------------------
-- 7. Enable RLS on EVERY Table in `public` (Rule S-1)
-- -----------------------------------------------------------------------------
alter table public.cities enable row level security;
alter table public.waitlist_signups enable row level security;
alter table public.colleges enable row level security;
alter table public.interests enable row level security;
alter table public.activities enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.profile_stats enable row level security;
alter table public.consents enable row level security;
alter table public.push_tokens enable row level security;
alter table public.verification_checks enable row level security;
alter table public.venues enable row level security;
alter table public.venue_photos enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_mutes enable row level security;
alter table public.messages enable row level security;
alter table public.calls enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.ratings enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.appeals enable row level security;
alter table public.audit_log enable row level security;
alter table public.usage_counters enable row level security;
alter table public.data_exports enable row level security;

-- -----------------------------------------------------------------------------
-- 8. RLS Policies (docs/data-model.md & docs/security.md)
-- -----------------------------------------------------------------------------
create policy cities_select on public.cities for select to authenticated using (true);
create policy cities_admin_write on public.cities for all to authenticated using (public.is_full_admin());

create policy waitlist_self_select on public.waitlist_signups for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy waitlist_self_insert on public.waitlist_signups for insert to authenticated with check (user_id = auth.uid());
create policy waitlist_self_delete on public.waitlist_signups for delete to authenticated using (user_id = auth.uid());

create policy colleges_select on public.colleges for select to authenticated using (status = 'active' or public.is_admin());
create policy interests_select on public.interests for select to authenticated using (true);
create policy activities_select on public.activities for select to authenticated using (true);

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or (status = 'active' and not public.is_blocked_between(auth.uid(), id)));

create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- S-35: Prevent client from updating privileged columns on profiles
revoke update on public.profiles from authenticated;
grant update (first_name, bio, interests, languages, area_cell, area_name, college_id, locale, city_id) on public.profiles to authenticated;

create policy profile_photos_select on public.profile_photos for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or (status = 'approved' and not public.is_blocked_between(auth.uid(), user_id)));
create policy profile_photos_insert on public.profile_photos for insert to authenticated
  with check (user_id = auth.uid());
create policy profile_photos_delete on public.profile_photos for delete to authenticated
  using (user_id = auth.uid());

create policy profile_stats_select on public.profile_stats for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or not public.is_blocked_between(auth.uid(), user_id));

create policy consents_self on public.consents for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy consents_insert on public.consents for insert to authenticated with check (user_id = auth.uid());

create policy push_tokens_self on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy verification_checks_select on public.verification_checks for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy venues_select on public.venues for select to authenticated
  using (
    public.is_admin()
    or (
      status = 'approved'
      and city_id = (select p.city_id from public.profiles p where p.id = auth.uid())
    )
  );

create policy venue_photos_select on public.venue_photos for select to authenticated
  using (status = 'approved' or public.is_admin());

-- S-14, S-15, S-16, S-17: Plan visibility via can_see_plan
create policy plans_select on public.plans for select to authenticated
  using (public.can_see_plan(auth.uid(), id));

create policy plans_host_update on public.plans for update to authenticated
  using (host_id = auth.uid() and status = 'open')
  with check (host_id = auth.uid() and status = 'open');

revoke update on public.plans from authenticated;
grant update (title, description) on public.plans to authenticated;

create policy plan_members_select on public.plan_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.plans pl
      where pl.id = plan_members.plan_id
        and (
          pl.host_id = auth.uid()
          or (
            public.can_see_plan(auth.uid(), pl.id)
            and plan_members.status in ('approved', 'attended')
          )
        )
    )
  );

create policy conversations_select on public.conversations for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.plan_members pm
      where pm.plan_id = conversations.plan_id
        and pm.user_id = auth.uid()
        and pm.status in ('approved', 'attended', 'no_show')
    )
  );

create policy conversation_mutes_select on public.conversation_mutes for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy messages_select on public.messages for select to authenticated
  using (
    public.is_admin()
    or (
      not public.is_blocked_between(auth.uid(), sender_id)
      and (status = 'visible' or sender_id = auth.uid())
      and exists (
        select 1
        from public.conversations c
        join public.plan_members pm on pm.plan_id = c.plan_id
        where c.id = messages.conversation_id
          and pm.user_id = auth.uid()
          and pm.status in ('approved', 'attended', 'no_show')
      )
    )
  );

create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_verified(auth.uid())
    and exists (
      select 1
      from public.conversations c
      join public.plan_members pm on pm.plan_id = c.plan_id
      where c.id = messages.conversation_id
        and c.status = 'open'
        and pm.user_id = auth.uid()
        and pm.status in ('approved', 'attended')
    )
    and not exists (
      select 1
      from public.conversation_mutes cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

create policy calls_select on public.calls for select to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid() or public.is_admin());

create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy blocks_self on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- S-19: Ratings, moderation_queue, audit_log readable only by admins
create policy ratings_admin_select on public.ratings for select to authenticated using (public.is_admin());
create policy moderation_queue_admin on public.moderation_queue for all to authenticated using (public.is_admin());
create policy appeals_select on public.appeals for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_full_admin() or (public.is_admin() and admin_id = auth.uid()));

create policy usage_counters_self on public.usage_counters for select to authenticated using (user_id = auth.uid());
create policy data_exports_self on public.data_exports for select to authenticated using (user_id = auth.uid());
create policy data_exports_delete on public.data_exports for delete to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 9. Triggers (S-20 text screening, S-27/S-28 message caps, S-46 audit_log immutable)
-- -----------------------------------------------------------------------------
create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'S-46: audit_log is insert-only and cannot be modified or deleted';
end;
$$;

create trigger trg_audit_log_immutable
before update or delete on public.audit_log
for each row execute function public.prevent_audit_log_mutation();

revoke update, delete on public.audit_log from public, anon, authenticated;

-- S-20: Screen text on messages, profiles, plans
create or replace function public.screen_text_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  txt text;
  matched_action text;
begin
  if tg_table_name = 'messages' then
    txt := coalesce(new.body, '');
  elsif tg_table_name = 'profiles' then
    txt := coalesce(new.first_name, '') || ' ' || coalesce(new.bio, '');
  elsif tg_table_name = 'plans' then
    txt := coalesce(new.title, '') || ' ' || coalesce(new.description, '');
  else
    return new;
  end if;

  -- Reject Indian phone numbers, URLs, emails, and social handles
  if txt ~* '(?:\+?91[\s.\-]*)?[6-9](?:[\s.\-]*\d){9}'
     or txt ~* '(?:https?:\/\/|www\.|@[a-z0-9_.]{2,}|\b(?:insta|instagram|snapchat|telegram|whatsapp|wa\.me)\b)' then
    raise exception 'S-20: Phone numbers, links, and social handles are not allowed';
  end if;

  -- Check hold terms in private.screen_terms
  select st.action into matched_action
  from private.screen_terms st
  where lower(txt) like '%' || lower(st.term) || '%'
  limit 1;

  if matched_action = 'reject' then
    raise exception 'S-20: Content contains restricted terms';
  elsif matched_action = 'hold' then
    if tg_table_name = 'messages' then
      new.status := 'held';
      new.flagged := true;
    elsif tg_table_name = 'profiles' then
      new.bio_status := 'held';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_screen_messages
before insert or update on public.messages
for each row execute function public.screen_text_trigger();

create trigger trg_screen_profiles
before insert or update on public.profiles
for each row execute function public.screen_text_trigger();

create trigger trg_screen_plans
before insert or update on public.plans
for each row execute function public.screen_text_trigger();

-- S-27 & S-28: Message rate limits (20/day for new accounts < 7 days, 30/min for all)
create or replace function public.enforce_message_caps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acct_created timestamptz;
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  daily_count int;
  minute_count int;
begin
  select p.created_at into acct_created
  from public.profiles p
  where p.id = new.sender_id;

  select count(*) into minute_count
  from public.messages m
  where m.sender_id = new.sender_id
    and m.created_at >= now() - interval '1 minute';

  if minute_count >= 30 then
    raise exception 'S-28: Message rate limit exceeded (max 30 per minute)';
  end if;

  if acct_created >= now() - interval '7 days' then
    insert into public.usage_counters (user_id, kind, period_start, count)
    values (new.sender_id, 'message_day', today_ist, 1)
    on conflict (user_id, kind, period_start)
    do update set count = public.usage_counters.count + 1
    returning count into daily_count;

    if daily_count > 20 then
      raise exception 'S-27: New accounts can send up to 20 messages per day during the first week';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_message_caps
before insert on public.messages
for each row execute function public.enforce_message_caps();

-- -----------------------------------------------------------------------------
-- 10. Core RPCs (create_plan, request_join, decide_join, cancel_plan, submit_report, block_user, submit_rating, submit_appeal)
-- -----------------------------------------------------------------------------
create or replace function public.create_plan(
  p_venue_id uuid,
  p_title text,
  p_description text,
  p_activity text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity smallint,
  p_audience public.plan_audience,
  p_college_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_venue public.venues%rowtype;
  v_week_start date := date_trunc('week', now() at time zone 'Asia/Kolkata')::date;
  v_host_count int;
  v_plan_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.status <> 'active' or v_profile.verification_status <> 'verified' then
    raise exception 'S-33: Only verified active users can host a plan';
  end if;

  if p_audience = 'women_only' and v_profile.verified_gender <> 'woman' then
    raise exception 'S-34: Only verified women can create women-only plans';
  end if;

  select * into v_venue from public.venues where id = p_venue_id;
  if v_venue.id is null or v_venue.status <> 'approved' or v_venue.city_id <> v_profile.city_id then
    raise exception 'S-31: Venue must be an approved public venue in your city';
  end if;

  if p_capacity < 3 or p_capacity > 10 then
    raise exception 'S-31: Group capacity must be between 3 and 10';
  end if;

  if p_starts_at < now() + interval '3 hours' then
    raise exception 'S-31: Plans must start at least 3 hours from now';
  end if;

  if p_ends_at <= p_starts_at or p_ends_at > p_starts_at + interval '6 hours' then
    raise exception 'S-32: Plan duration must be between 30 minutes and 6 hours';
  end if;

  if not v_venue.late_events_allowed then
    if (p_ends_at at time zone 'Asia/Kolkata')::time > time '21:00'
       or (p_ends_at at time zone 'Asia/Kolkata')::date <> (p_starts_at at time zone 'Asia/Kolkata')::date then
      raise exception 'S-32: Plans must end by 21:00 IST unless at a late-evening partner venue';
    end if;
  end if;

  -- S-26: Free tier host cap (1 per week)
  if v_profile.entitlement = 'free' then
    insert into public.usage_counters (user_id, kind, period_start, count)
    values (v_uid, 'host_week', v_week_start, 1)
    on conflict (user_id, kind, period_start)
    do update set count = public.usage_counters.count + 1
    returning count into v_host_count;

    if v_host_count > 1 then
      raise exception 'S-26: Free tier users can host 1 plan per week';
    end if;
  end if;

  insert into public.plans (
    city_id, host_id, venue_id, title, description, activity,
    starts_at, ends_at, capacity, approved_count, audience, college_id, status
  )
  values (
    v_profile.city_id, v_uid, p_venue_id, p_title, p_description, p_activity,
    p_starts_at, p_ends_at, p_capacity, 1, p_audience, p_college_id, 'open'
  )
  returning id into v_plan_id;

  insert into public.plan_members (plan_id, user_id, status, decided_at)
  values (v_plan_id, v_uid, 'approved', now());

  insert into public.conversations (kind, plan_id, status, opened_at, closes_at)
  values ('plan', v_plan_id, 'open', now(), p_ends_at + interval '24 hours');

  return v_plan_id;
end;
$$;

create or replace function public.request_join(
  p_plan_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_plan public.plans%rowtype;
  v_week_start date := date_trunc('week', now() at time zone 'Asia/Kolkata')::date;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_week_joins int;
  v_day_joins int;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.status <> 'active' or v_profile.verification_status <> 'verified' then
    raise exception 'S-33: Verification required before joining a plan';
  end if;

  if not public.can_see_plan(v_uid, p_plan_id) then
    raise exception 'Plan not found';
  end if;

  select * into v_plan from public.plans where id = p_plan_id for update;
  if v_plan.status <> 'open' then
    raise exception 'Plan is no longer open for requests';
  end if;

  -- S-27 & S-28: Daily join caps
  insert into public.usage_counters (user_id, kind, period_start, count)
  values (v_uid, 'join_day', v_today, 1)
  on conflict (user_id, kind, period_start)
  do update set count = public.usage_counters.count + 1
  returning count into v_day_joins;

  if v_profile.created_at >= now() - interval '7 days' and v_day_joins > 5 then
    raise exception 'S-27: New accounts can request up to 5 joins per day during the first week';
  elsif v_day_joins > 20 then
    raise exception 'S-28: Daily join request limit reached';
  end if;

  -- S-25: Free tier weekly join cap (2 per week)
  if v_profile.entitlement = 'free' then
    insert into public.usage_counters (user_id, kind, period_start, count)
    values (v_uid, 'join_week', v_week_start, 1)
    on conflict (user_id, kind, period_start)
    do update set count = public.usage_counters.count + 1
    returning count into v_week_joins;

    if v_week_joins > 2 then
      raise exception 'S-25: Free tier includes 2 plan joins per week';
    end if;
  end if;

  insert into public.plan_members (plan_id, user_id, status, requested_at, note)
  values (p_plan_id, v_uid, 'requested', now(), p_note)
  on conflict (plan_id, user_id) do update
  set status = 'requested', requested_at = now(), note = excluded.note
  where public.plan_members.status in ('withdrawn', 'left');
end;
$$;

create or replace function public.decide_join(
  p_plan_id uuid,
  p_member_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_plan public.plans%rowtype;
  v_week_start date := date_trunc('week', now() at time zone 'Asia/Kolkata')::date;
begin
  select * into v_plan from public.plans where id = p_plan_id for update;
  if v_plan.host_id <> v_uid then
    raise exception 'Only the host can review requests';
  end if;

  if p_decision = 'approve' then
    if v_plan.approved_count >= v_plan.capacity then
      raise exception 'Plan is already full';
    end if;

    update public.plan_members
    set status = 'approved', decided_at = now(), updated_at = now()
    where plan_id = p_plan_id and user_id = p_member_id and status = 'requested';

    update public.plans
    set approved_count = approved_count + 1,
        status = case when approved_count + 1 >= capacity then 'full'::public.plan_status else status end,
        updated_at = now()
    where id = p_plan_id;

  elsif p_decision = 'decline' then
    -- PL-3 & S-25: Decline shows no reason and returns the weekly join slot
    update public.plan_members
    set status = 'declined', decided_at = now(), updated_at = now()
    where plan_id = p_plan_id and user_id = p_member_id and status = 'requested';

    update public.usage_counters
    set count = greatest(0, count - 1)
    where user_id = p_member_id and kind = 'join_week' and period_start = v_week_start;
  else
    raise exception 'Invalid decision';
  end if;
end;
$$;

create or replace function public.submit_report(
  p_target_user_id uuid,
  p_reason public.report_reason,
  p_details text default '',
  p_plan_id uuid default null,
  p_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_severity public.report_severity;
  v_report_id uuid;
  v_distinct_reporters int;
  v_conv_id uuid;
begin
  if v_uid is null or v_uid = p_target_user_id then
    raise exception 'Invalid report target';
  end if;

  v_severity := case
    when p_reason in ('sexual_content', 'threat_or_violence', 'underage', 'unsafe_at_plan') then 'severe'
    else 'standard'
  end;

  insert into public.reports (reporter_id, target_user_id, plan_id, message_id, reason, severity, details)
  values (v_uid, p_target_user_id, p_plan_id, p_message_id, p_reason, v_severity, coalesce(p_details, ''))
  returning id into v_report_id;

  insert into public.moderation_queue (subject, subject_id, user_id, severity, due_at)
  values (
    'report',
    v_report_id,
    p_target_user_id,
    v_severity,
    now() + case when v_severity = 'severe' then interval '12 hours' else interval '24 hours' end
  );

  -- PRD §4 edge case: If reported during/from a plan, mute target in that conversation and hold open 24h
  if p_plan_id is not null then
    select id into v_conv_id from public.conversations where plan_id = p_plan_id;
    if v_conv_id is not null then
      insert into public.conversation_mutes (conversation_id, user_id, reason)
      values (v_conv_id, p_target_user_id, 'in_plan_report')
      on conflict do nothing;

      update public.conversations
      set hold_until = greatest(coalesce(hold_until, closes_at), now() + interval '24 hours')
      where id = v_conv_id;
    end if;
  end if;

  -- VR-5: Auto-suspend when 2 reports from 2 distinct verified users arrive in 30 days (or 1 underage report)
  select count(distinct r.reporter_id) into v_distinct_reporters
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  where r.target_user_id = p_target_user_id
    and r.created_at >= now() - interval '30 days'
    and rp.verification_status = 'verified'
    and rp.status = 'active';

  if v_distinct_reporters >= 2 or p_reason = 'underage' then
    update public.profiles
    set status = 'suspended',
        status_reason = 'Your account is paused while our safety team reviews recent community reports. We will reply within 24 hours.',
        updated_at = now()
    where id = p_target_user_id and status = 'active';
  end if;

  return v_report_id;
end;
$$;

create or replace function public.block_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or v_uid = p_target_user_id then
    raise exception 'Invalid block target';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_uid, p_target_user_id)
  on conflict do nothing;

  -- S-17: If blocker hosts an open/full plan that blocked user is in, remove blocked user
  update public.plan_members pm
  set status = 'removed', updated_at = now()
  from public.plans pl
  where pm.plan_id = pl.id
    and pl.host_id = v_uid
    and pm.user_id = p_target_user_id
    and pl.status in ('open', 'full')
    and pm.status in ('requested', 'approved');
end;
$$;

-- Lifecycle tick (Architecture §Plan lifecycle)
create or replace function public.plan_lifecycle_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 1. open | full -> started
  update public.plans
  set status = 'started', updated_at = now()
  where status in ('open', 'full') and starts_at <= now();

  -- 2. started -> completed
  update public.plans
  set status = 'completed', updated_at = now()
  where status = 'started' and ends_at <= now();

  -- Mark attended vs no_show on completed plans
  update public.plan_members pm
  set status = case when pm.checked_in_at is not null then 'attended'::public.member_status else 'no_show'::public.member_status end,
      updated_at = now()
  from public.plans pl
  where pm.plan_id = pl.id
    and pl.status = 'completed'
    and pm.status = 'approved';

  -- 3. Close conversations 24h after plan ends (respecting hold_until)
  update public.conversations
  set status = 'closed'
  where status = 'open'
    and closes_at <= now()
    and (hold_until is null or hold_until <= now());

  -- 4. Expire pending requests on started/completed/cancelled plans
  update public.plan_members pm
  set status = 'expired', updated_at = now()
  from public.plans pl
  where pm.plan_id = pl.id
    and pl.status in ('started', 'completed', 'cancelled')
    and pm.status = 'requested';
end;
$$;
