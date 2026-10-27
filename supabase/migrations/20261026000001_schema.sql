-- Yuvomeet P0 schema: extensions, enums, tables, indexes.
-- Region ap-south-1. Table and column names follow docs/data-model.md.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.city_status as enum ('waitlist', 'beta', 'live');
create type public.profile_status as enum ('onboarding', 'active', 'suspended', 'banned', 'deleted');
create type public.gender as enum ('woman', 'man', 'other');
create type public.verification_status as enum ('unverified', 'pending', 'manual_review', 'verified', 'rejected', 'blocked_minor');
create type public.check_type as enum ('id_age', 'liveness_face', 'gender');
create type public.verdict as enum ('pass', 'fail', 'review', 'minor');
create type public.media_status as enum ('pending', 'approved', 'rejected');
create type public.venue_status as enum ('draft', 'approved', 'archived');
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
create type public.notification_category as enum ('plan', 'approval', 'safety', 'account');

-- -----------------------------------------------------------------------------
-- Private tables (S-3: never exposed through PostgREST)
-- -----------------------------------------------------------------------------
create table private.settings (
  key text primary key,
  val text not null,
  updated_at timestamptz not null default now()
);

create table private.otp_attempts (
  phone_hmac text primary key,
  failed_count int not null default 0,
  locked_until timestamptz null,
  updated_at timestamptz not null default now()
);

create table private.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('reviewer', 'admin')),
  granted_by uuid null references auth.users (id),
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
  user_id uuid null references auth.users (id) on delete set null,
  is_minor boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table private.kyc_sessions (
  transaction_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt smallint not null,
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table private.kyc_extra_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted int not null default 0
);

create table private.webhook_events (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table private.edge_rate (
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, endpoint, window_start)
);

create table private.vendor_usage (
  vendor text not null,
  day date not null,
  units int not null default 0,
  primary key (vendor, day)
);

create table private.deletion_jobs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null,
  completed_at timestamptz null
);

-- Server-side analytics (implementation-plan §Analytics): events that happen while the app is
-- closed. Props hold allow-listed keys only; analytics-flush re-checks them before PostHog.
create table private.analytics_outbox (
  id bigint generated always as identity primary key,
  event text not null,
  distinct_id uuid not null,
  city_slug text not null default 'unknown',
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Public tables (S-1 RLS on all, S-5 no phone column)
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
  user_id uuid not null references auth.users (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now()
);

create table public.interests (
  slug text primary key,
  label text not null,
  icon text not null,
  sort int not null default 0
);

create table public.activities (
  slug text primary key,
  label text not null,
  icon text not null,
  sort int not null default 0
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  city_id uuid null references public.cities (id),
  first_name text not null default '' check (char_length(first_name) <= 30),
  birth_year smallint null,
  declared_gender public.gender null,
  verified_gender public.gender null,
  bio text null check (bio is null or char_length(bio) <= 300),
  bio_status public.content_status not null default 'visible',
  interests text[] not null default '{}',
  languages text[] not null default '{en}',
  area_cell text not null default '',
  area_name text not null default '',
  college_id uuid null references public.colleges (id),
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz null,
  status public.profile_status not null default 'onboarding',
  status_reason text null,
  entitlement public.entitlement not null default 'free',
  rules_accepted_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quarantine_path text not null,
  path text null,
  sha256 text null,
  position smallint not null check (position between 0 and 5),
  status public.media_status not null default 'pending',
  reject_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plans_attended int not null default 0,
  plans_no_show int not null default 0,
  plans_hosted int not null default 0,
  late_cancel_count_30d int not null default 0,
  unsafe_ratings_30d int not null default 0,
  reports_received_30d int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purpose public.consent_purpose not null,
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null default 'android' check (platform in ('android', 'ios')),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table public.verification_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.check_type not null,
  provider text not null default 'hyperverge',
  provider_ref text not null,
  ai_score numeric null,
  verdict public.verdict not null,
  evidence jsonb not null default '{}'::jsonb,
  reviewer_id uuid null references auth.users (id),
  decided_at timestamptz null,
  attempt smallint not null default 1,
  created_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  area_name text not null,
  area_cell text not null,
  lat double precision not null,
  lng double precision not null,
  address_line text not null,
  hours jsonb not null default '{}'::jsonb,
  capacity int not null default 20 check (capacity > 0),
  partner boolean not null default false,
  late_events_allowed boolean not null default false,
  status public.venue_status not null default 'draft',
  approved_by uuid null references auth.users (id),
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  path text not null,
  position smallint not null default 0,
  status public.media_status not null default 'approved',
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  -- Null after the host's account is purged; the plan history stays for members.
  host_id uuid null references public.profiles (id) on delete set null,
  venue_id uuid not null references public.venues (id),
  title text not null check (char_length(title) between 3 and 60),
  description text null check (description is null or char_length(description) <= 500),
  activity text not null references public.activities (slug),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity smallint not null check (capacity between 3 and 10),
  approved_count smallint not null default 1,
  audience public.plan_audience not null default 'everyone',
  college_id uuid null references public.colleges (id),
  requires_approval boolean not null default true,
  price_paise int null,
  status public.plan_status not null default 'open',
  late_cancel boolean not null default false,
  cancel_reason text null,
  cancelled_at timestamptz null,
  rating_prompted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_time_order check (ends_at > starts_at),
  constraint same_college_needs_college check (audience <> 'same_college' or college_id is not null)
);

create table public.plan_members (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.member_status not null default 'requested',
  requested_at timestamptz not null default now(),
  decided_at timestamptz null,
  checked_in_at timestamptz null,
  note text null check (note is null or char_length(note) <= 140),
  updated_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'plan',
  plan_id uuid null unique references public.plans (id) on delete cascade,
  status public.conversation_status not null default 'open',
  opened_at timestamptz not null default now(),
  closes_at timestamptz not null,
  hold_until timestamptz null,
  created_at timestamptz not null default now()
);

create table public.conversation_mutes (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Null after the sender's account is purged; the row reads "Message removed".
  sender_id uuid null references public.profiles (id) on delete set null,
  body text null check (body is null or char_length(body) between 1 and 1000),
  image_path text null,
  image_status public.media_status null,
  status public.content_status not null default 'visible',
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  -- Photo messages start with image_status 'pending' and get image_path after moderation.
  constraint message_body_or_image check (body is not null or image_path is not null or image_status is not null)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  -- Pseudonymous IDs without foreign keys: reports outlive account deletion (privacy §3).
  reporter_id uuid not null,
  target_user_id uuid not null,
  plan_id uuid null references public.plans (id) on delete set null,
  message_id uuid null references public.messages (id) on delete set null,
  reason public.report_reason not null,
  severity public.report_severity not null,
  details text not null default '' check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint no_self_report check (reporter_id <> target_user_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create table public.ratings (
  plan_id uuid not null references public.plans (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  felt_safe boolean not null,
  showed_up boolean not null,
  created_at timestamptz not null default now(),
  primary key (plan_id, rater_id, ratee_id),
  constraint no_self_rating check (rater_id <> ratee_id)
);

create table public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  subject public.queue_subject not null,
  subject_id uuid not null,
  user_id uuid not null, -- pseudonymous, kept after deletion
  severity public.report_severity not null default 'standard',
  ai_verdict public.verdict null,
  ai_score numeric null,
  ai_labels jsonb not null default '[]'::jsonb,
  status public.queue_status not null default 'pending',
  assigned_to uuid null references auth.users (id),
  assigned_at timestamptz null,
  decision_reason text null,
  decided_by uuid null references auth.users (id),
  decided_at timestamptz null,
  due_at timestamptz not null,
  alerted_at timestamptz null,
  created_at timestamptz not null default now()
);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject public.appeal_subject not null,
  subject_id uuid not null,
  message text not null check (char_length(message) between 10 and 1000),
  status public.appeal_status not null default 'open',
  response text null,
  decided_by uuid null references auth.users (id),
  decided_at timestamptz null,
  due_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users (id),
  action text not null,
  subject_type text not null,
  subject_id uuid not null,
  reason text not null check (char_length(trim(reason)) > 0),
  before jsonb null,
  after jsonb null,
  created_at timestamptz not null default now()
);

create table public.usage_counters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('join_week', 'host_week', 'join_day', 'message_day', 'report_day')),
  period_start date not null,
  count int not null default 0,
  primary key (user_id, kind, period_start)
);

create table public.data_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null,
  kind text not null,
  title text not null,
  body text not null,
  plan_id uuid null references public.plans (id) on delete cascade,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes (docs/data-model.md)
-- -----------------------------------------------------------------------------
create index on public.plans (city_id, status, starts_at, id);
create index on public.plans (city_id, activity, starts_at) where status in ('open', 'full');
create index on public.plans (host_id, starts_at desc);
create index on public.plans (status, starts_at);
create index on public.plans (status, ends_at);
create index on public.plan_members (user_id, status);
create index on public.plan_members (plan_id, status);
create index on public.messages (conversation_id, created_at desc, id);
create index on public.messages (sender_id, created_at);
create index on public.conversations (status, closes_at);
create index on public.blocks (blocked_id, blocker_id);
create index on public.reports (target_user_id, created_at);
create index on public.reports (reporter_id, created_at);
create index on public.ratings (ratee_id, created_at) where felt_safe = false;
create index on public.moderation_queue (status, severity, due_at);
create index on public.moderation_queue (subject, subject_id);
create index on public.appeals (status, due_at);
create index on public.venues (city_id, status);
create index on public.profile_photos (user_id, position);
create index on public.profiles (city_id, status);
create index on public.profiles using gin (first_name extensions.gin_trgm_ops);
create index on public.audit_log (subject_type, subject_id, created_at desc);
create index on public.notifications (user_id, created_at desc);
create index on public.verification_checks (user_id, type, created_at desc);
