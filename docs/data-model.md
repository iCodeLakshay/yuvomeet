# Data model

Postgres in Supabase, region `ap-south-1`. This extends the PRD's table list (§6) with the tables the product needs but the PRD does not name. Rules referenced as S-n are in [security.md](security.md).

Conventions:

- Primary keys are `uuid` (`gen_random_uuid()`), except join tables, which use composite keys.
- Every table has `created_at timestamptz not null default now()`; mutable tables also have `updated_at` maintained by a trigger.
- Times are `timestamptz`. Business rules that mention days, weeks, or 21:00 use `Asia/Kolkata`.
- Money is integer paise (`price_paise`), never floats.
- `public` holds client-reachable tables, all with RLS. `private` holds server-only tables, not exposed through PostgREST.
- Soft state changes use status enums; hard deletes happen only through the retention job ([privacy-and-compliance.md](privacy-and-compliance.md)).

## Enums

| Enum | Values |
| ---- | ------ |
| `city_status` | `waitlist`, `beta`, `live` |
| `profile_status` | `onboarding`, `active`, `suspended`, `banned`, `deleted` |
| `gender` | `woman`, `man`, `other` |
| `verification_status` | `unverified`, `pending`, `manual_review`, `verified`, `rejected`, `blocked_minor` |
| `check_type` | `id_age`, `liveness_face`, `gender` |
| `verdict` | `pass`, `fail`, `review`, `minor` |
| `media_status` | `pending`, `approved`, `rejected` |
| `plan_audience` | `everyone`, `women_only`, `same_college` |
| `plan_status` | `open`, `full`, `started`, `completed`, `cancelled` |
| `member_status` | `requested`, `approved`, `declined`, `withdrawn`, `left`, `removed`, `expired`, `attended`, `no_show` |
| `conversation_kind` | `plan`, `pair` (P1) |
| `conversation_status` | `open`, `closed` |
| `content_status` | `visible`, `held`, `rejected` |
| `report_reason` | `harassment`, `sexual_content`, `threat_or_violence`, `fake_profile`, `underage`, `spam_or_scam`, `no_show`, `unsafe_at_plan`, `other` |
| `report_severity` | `severe`, `standard` |
| `report_status` | `open`, `actioned`, `dismissed` |
| `queue_subject` | `photo`, `text`, `verification`, `report`, `rating_review`, `venue`, `appeal` |
| `queue_status` | `pending`, `in_review`, `approved`, `rejected`, `escalated` |
| `appeal_status` | `open`, `upheld`, `denied` |
| `entitlement` | `free`, `plus`, `premium` |
| `consent_purpose` | `location`, `camera`, `notifications`, `community_rules`, `terms_privacy` |

`member_status` adds `withdrawn`, `left`, `removed`, and `expired` to the PRD's five because caps (S-25) and lifecycle need to tell them apart. `severe` reasons are `sexual_content`, `threat_or_violence`, `underage`, `unsafe_at_plan`.

## Tables

### Cities and waitlist

**`cities`** — PRD. `id`, `name`, `slug`, `status city_status`, `launch_date date null`, `timezone text default 'Asia/Kolkata'`, `center_lat`, `center_lng`.

**`waitlist_signups`** — new. `user_id`, `city_id`, `created_at`. PK (`user_id`, `city_id`). Written when a user picks a non-live city (ON-2). Admins see counts per city.

**`colleges`** — new. `id`, `city_id`, `name`, `status` (`active`/`hidden`). Admin-maintained list for same-college plans.

### People

**`profiles`** — PRD, extended. One row per `auth.users` row, created by trigger on sign-up.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid PK, FK `auth.users` | |
| `city_id` | uuid FK | |
| `first_name` | text, 1–30 chars | Screened (S-20) |
| `birth_year` | smallint null | From KYC only; never client-written |
| `declared_gender` | `gender` | Set once at profile creation; changed only by admin (S-42) |
| `verified_gender` | `gender` null | From KYC / manual review |
| `bio` | text ≤ 300 | Screened |
| `bio_status` | `content_status` | |
| `interests` | text[] | Values from `interests` lookup |
| `languages` | text[] | ISO codes, e.g. `hi`, `en` |
| `area_cell` | text | H3 resolution 8 cell (~0.7 km² ≈ 1 km across). Never a lat/lng. Not exposed to other users |
| `area_name` | text | Display name of the area, e.g. "Talwandi" |
| `college_id` | uuid null | Self-declared (S-16) |
| `verification_status` | `verification_status` | |
| `verified_at` | timestamptz null | Set when all three checks pass (S-41) |
| `status` | `profile_status` | |
| `status_reason` | text null | Shown to the user when suspended (VR-5) |
| `entitlement` | `entitlement` default `free` | Written by RevenueCat webhook (P1) |
| `locale` | text default `en` | `hi` or `en` |
| `rules_accepted_at` | timestamptz null | ON-4 |
| `deleted_at` | timestamptz null | Deletion requested; purge scheduled |

No phone column (S-5). No precise location column.

**`interests`** — new lookup. `slug`, `label_en`, `label_hi`, `sort`.

**`profile_photos`** — new. `id`, `user_id`, `path` (in `media`), `quarantine_path`, `sha256`, `position` 0–5, `status media_status`. ON-3: a profile becomes `active` only with ≥ 2 `approved` photos; enforced by the `complete_profile` RPC and a check in `is_active`.

**`profile_stats`** — new, maintained by triggers and the lifecycle job. `user_id`, `plans_attended`, `plans_no_show`, `plans_hosted`, `late_cancel_count_30d`, `unsafe_ratings_30d`, `reports_received_30d`. Hosts see `plans_attended` and a show-up rate (when ≥ 3 plans) for requesters (PL-3). Unsafe and report counts are admin-only (column grants).

**`consents`** — new. `id`, `user_id`, `purpose consent_purpose`, `granted bool`, `policy_version text`, `created_at`. Append-only; the latest row per purpose wins. Written when the consent screen is accepted and whenever the user changes a setting.

**`push_tokens`** — new. `user_id`, `token`, `platform`, `last_seen_at`. PK (`user_id`, `token`).

### Verification

**`verification_checks`** — PRD. `id`, `user_id`, `type check_type`, `provider` (`hyperverge`), `provider_ref`, `ai_score numeric null`, `verdict verdict`, `evidence jsonb` (scores and reason codes only; no images, ID numbers, names, or full DOB), `reviewer_id uuid null`, `decided_at`, `attempt smallint`. VR-2 allows one retry: the RPC refuses a third `liveness_face` attempt and routes to manual review.

**`private.identity_fingerprints`** — new. `fingerprint text PK` (HMAC, S-39), `user_id`, `is_minor bool`, `created_at`. Unique fingerprint means one ID per account and blocks returning minors.

**`private.kyc_cache`** — new. Last verdict per user and fingerprint so retries and reinstalls do not rebill ([integrations.md](integrations.md)).

### Venues

**`venues`** — PRD, extended. `id`, `city_id`, `name`, `area_name`, `area_cell`, `lat`, `lng` (public place pin), `address_line`, `hours jsonb` (per weekday open/close), `capacity int`, `partner bool`, `late_events_allowed bool` (S-32), `status` (`draft`, `approved`, `archived`), `approved_by`, `approved_at`.

**`venue_photos`** — new. `id`, `venue_id`, `path`, `position`, `status media_status`.

### Plans

**`plans`** — PRD, extended.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid PK | |
| `city_id` | uuid FK | Copied from venue; must match host's city |
| `host_id` | uuid FK `profiles` | |
| `venue_id` | uuid FK `venues` | Approved only (S-31) |
| `title` | text 3–60 | Screened |
| `description` | text ≤ 500 null | Screened |
| `activity` | text | From `activities` lookup |
| `starts_at`, `ends_at` | timestamptz | S-31, S-32 |
| `capacity` | smallint 3–10 | Includes host |
| `approved_count` | smallint | Maintained by trigger; drives `full` |
| `audience` | `plan_audience` | |
| `college_id` | uuid null | Required when `audience = 'same_college'` |
| `price_paise` | int null | P1 tickets (PL-8); null in P0 |
| `status` | `plan_status` | Server-written only |
| `late_cancel` | bool default false | PL-5 |
| `cancel_reason` | text null | Shown to members |
| `cancelled_at` | timestamptz null | |

**`activities`** — new lookup. `slug`, `label_en`, `label_hi`, `sort`.

**`plan_members`** — PRD. PK (`plan_id`, `user_id`). `status member_status`, `requested_at`, `decided_at`, `checked_in_at` (no coordinates, S-36), `note text ≤ 140 null` (optional message to host, screened). The host is inserted as `approved` on create.

### Chat

**`conversations`** — PRD. `id`, `kind conversation_kind`, `plan_id null` (unique when `kind = 'plan'`), `user_a`, `user_b` (P1 pair), `status conversation_status`, `opened_at`, `closes_at` (plan `ends_at` + 24 h), `hold_until null` (set by in-plan report, see [moderation-and-safety.md](moderation-and-safety.md)), `pair_unmask_at null` (P1: CH-3 3-day masking).

A plan conversation is created with the plan. Membership is derived from `plan_members` with status `approved`, `attended`, or `no_show`; there is no separate participants table.

**`conversation_mutes`** — new. PK (`conversation_id`, `user_id`). `reason`, `created_at`. A muted user can read but not post (PRD §4 edge case).

**`messages`** — PRD. `id` (client-generated UUID for offline idempotency), `conversation_id`, `sender_id`, `body text ≤ 1000 null`, `image_path null`, `image_status media_status null`, `status content_status`, `flagged bool`, `created_at`. Body or image required. Realtime publication on this table only, filtered by RLS.

**`calls`** (P1) — PRD. `id`, `conversation_id`, `caller_id`, `callee_id`, `started_at`, `ended_at`, `duration_s`. No audio, no recording URL column (VC-4).

### Trust and safety

**`reports`** — PRD. `id`, `reporter_id`, `target_user_id`, `plan_id null`, `message_id null`, `reason report_reason`, `severity report_severity` (derived from reason), `details text ≤ 1000`, `status report_status`, `created_at`. Reporters see their own reports' status, not the outcome detail.

**`blocks`** — PRD. PK (`blocker_id`, `blocked_id`). `created_at`.

**`ratings`** — PRD. PK (`plan_id`, `rater_id`, `ratee_id`). `felt_safe bool`, `showed_up bool`, `created_at`. One row per co-member rated, so "two unsafe ratings" (SF-4) can be attributed to a person. Insert-only for raters; read admin-only (S-19).

**`moderation_queue`** — PRD. `id`, `subject queue_subject`, `subject_id`, `user_id` (subject owner), `severity report_severity`, `ai_verdict verdict null`, `ai_score numeric null`, `ai_labels jsonb`, `status queue_status`, `assigned_to null`, `decision_reason text null`, `decided_by null`, `decided_at null`, `due_at` (SLA), `created_at`.

**`appeals`** — new. `id`, `user_id`, `subject` (`verification`, `suspension`, `content`, `ban`), `subject_id`, `message text ≤ 1000`, `status appeal_status`, `response text null`, `decided_by`, `decided_at`, `due_at` (created + 48 h, VR-6).

**`audit_log`** — new. `id bigint identity`, `admin_id`, `action text`, `subject_type text`, `subject_id uuid`, `reason text not null`, `before jsonb`, `after jsonb`, `created_at`. Insert-only (S-46).

### Counters and housekeeping

**`usage_counters`** — new. PK (`user_id`, `kind`, `period_start`). `count int`. Kinds: `join_week`, `host_week`, `join_day`, `message_day`, `report_day`. Updated inside the RPC or trigger that consumes the slot, with `insert … on conflict do update` under row lock.

**`data_exports`** — new. `id`, `user_id`, `path` (private bucket), `status`, `expires_at` (7 days), `created_at`.

**`private.otp_attempts`** — `phone_hmac PK`, `failed_count`, `locked_until`, `updated_at` (S-8, S-10).

**`private.settings`** — key/value for caps and windows (`free_joins_per_week = 2`, `free_hosts_per_week = 1`, `new_account_days = 7`, `new_join_per_day = 5`, `new_msg_per_day = 20`, `plan_min_lead_hours = 3`, `plan_cutoff_local = '21:00'`, `checkin_radius_m = 150`, `checkin_window_min = 30`, `chat_close_hours = 24`).

**`private.admin_roles`** — `user_id PK`, `role` (`reviewer`, `admin`), `granted_by`, `created_at` (S-43).

**`private.screen_terms`** — `term`, `lang`, `action` (`reject`, `hold`).

**`private.media_moderation`** — `sha256 PK`, `verdict`, `labels jsonb`, `checked_at`. Cache so the same image is not sent to Rekognition twice.

**`private.webhook_events`** — `provider`, `event_id`, `received_at`. PK (`provider`, `event_id`) for replay protection (S-53).

**`private.edge_rate`** — sliding-window counters for Edge Functions.

**`private.vendor_usage`** — `vendor`, `day date`, `units int`. PK (`vendor`, `day`). Cost-guard ledger ([integrations.md](integrations.md)).

**`private.deletion_jobs`** — `user_id PK`, `requested_at`, `purge_after` (requested + 30 days, or sooner), `completed_at`. Driven by `retention_tick` ([privacy-and-compliance.md](privacy-and-compliance.md)).

### P1 tables (reserved, created when P1 starts)

- `subscriptions` — PRD. `user_id`, `tier entitlement`, `product_id` (`plus_women`, `plus_men`, `premium`), `store_ref`, `status`, `renews_at`, `cancel_at_period_end`. Written only by `revenuecat-webhook`.
- `tickets` — `id`, `plan_id`, `user_id`, `razorpay_order_id`, `razorpay_payment_id`, `amount_paise`, `commission_paise`, `status`, `refunded_at`.
- `venue_invoices` — `id`, `venue_id`, `period`, `amount_paise`, `gst_paise`, `razorpay_invoice_id`, `status`.
- `venue_offers`, `offer_redemptions` (VN-2), `curated_tables`, `curated_assignments` (PL-7), `contact_shares` (CS-1, stores the event, not the number).

## RLS matrix

`self` = row belongs to `auth.uid()`. `active` = `is_active(auth.uid())`. `verified` = `verification_status = 'verified'`. `visible plan` = city match, audience rule (S-15, S-16), and not blocked (S-17). `admin` = `app_role in ('reviewer','admin')` with `aal2`; `admin*` = `app_role = 'admin'` only. "RPC" means no direct grant; writes go through a `security definer` function.

| Table | Select | Insert | Update | Delete |
| ----- | ------ | ------ | ------ | ------ |
| `cities` | everyone (authenticated) | admin* | admin* | — |
| `waitlist_signups` | self, admin | self | — | self |
| `colleges` | authenticated, `active` rows | admin | admin | — |
| `profiles` | self (all columns); others via `public_profiles` view if active and not blocked; admin | trigger only | self (whitelisted columns: `first_name`, `bio`, `interests`, `languages`, `area_*`, `college_id`, `locale`); RPC for the rest | — (deletion via `delete-account`) |
| `profile_photos` | self (any status); others `approved` only via view; admin | self (via upload flow) | RPC (`moderate-image` sets status) | self |
| `profile_stats` | self; others limited columns via view; admin all | trigger | trigger | — |
| `consents` | self, admin | self | — | — |
| `push_tokens` | self | self | self | self |
| `verification_checks` | self (verdict, type, decided_at only); admin | Edge only | Edge, admin | — |
| `venues` | `approved` in own city; admin all | admin | admin | — |
| `venue_photos` | with venue; admin | admin | admin | admin |
| `plans` | `visible plan` and `active` (verification not required, ON-5); host; admin | RPC `create_plan` | host: `title`, `description` only while `open`; RPC for status | — |
| `plan_members` | self; host of plan; approved co-members (status only); admin | RPC `request_join` | RPC (`decide_join`, `leave_plan`, `check-in`, cron) | — |
| `conversations` | members of plan (approved/attended/no_show), not blocked; admin | trigger on plan create | cron, RPC | — |
| `conversation_mutes` | self (own mute), admin | RPC `submit_report`, admin | admin | admin |
| `messages` | conversation member, sender not blocked either way, `status = 'visible'` or own; admin | member, `active`, `verified`, conversation `open`, not muted (trigger screens) | — | sender within 2 min (soft-delete to `rejected`); admin |
| `reports` | self (as reporter: id, reason, status); admin | RPC `submit_report` | admin | — |
| `blocks` | self (as blocker) | RPC `block_user` | — | self (unblock) |
| `ratings` | admin | RPC `submit_rating` (plan member, completed plan, within 7 days) | — | — |
| `moderation_queue` | admin | trigger / Edge | admin | — |
| `appeals` | self, admin | RPC `submit_appeal` | admin | — |
| `audit_log` | admin* (reviewers see own) | in-transaction from admin actions | never | never |
| `usage_counters` | self | RPC / trigger | RPC / trigger | — |
| `data_exports` | self | Edge | Edge | self |

Realtime: only `messages` and `plan_members` are in the `supabase_realtime` publication. Realtime applies the same select policies, so a user only receives rows they could select.

## Indexes

| Index | Serves |
| ----- | ------ |
| `plans (city_id, status, starts_at, id)` | Feed (PL-2), keyset pagination |
| `plans (city_id, activity, starts_at) where status in ('open','full')` | Activity filter |
| `plans (host_id, starts_at desc)` | My plans, weekly host cap |
| `plans (status, starts_at)`, `plans (status, ends_at)` | Lifecycle cron |
| `plan_members (user_id, status)` | My plans, caps |
| `plan_members (plan_id, status)` | Host request list, member list |
| `messages (conversation_id, created_at desc, id)` | Chat history pagination |
| `messages (sender_id, created_at)` | Per-minute rate limit |
| `conversations (status, closes_at)`, `conversations (plan_id)` | Close job, lookup |
| `blocks (blocked_id, blocker_id)` | Reverse block check (PK covers forward) |
| `reports (target_user_id, created_at)` | Auto-suspend count (VR-5) |
| `ratings (ratee_id, created_at) where felt_safe = false` | Unsafe-rating trigger (SF-4) |
| `moderation_queue (status, severity, due_at)` | Queue view, SLA alert |
| `appeals (status, due_at)` | Appeals queue |
| `venues (city_id, status)` | Venue list |
| `profile_photos (user_id, position)` | Profile load |
| `profiles (city_id, status)` | Admin lookup |
| `profiles using gin (first_name gin_trgm_ops)` | Admin name search (AD-2) |
| `audit_log (subject_type, subject_id, created_at desc)` | Action history (AD-2) |

## Helper functions (SQL, `security definer`, `stable`)

- `is_active(uid)` — `status = 'active'` and ≥ 2 approved photos.
- `is_verified(uid)` — `verification_status = 'verified'`.
- `is_verified_woman(uid)` — verified and `verified_gender = 'woman'`.
- `is_blocked_between(a, b)` — row in `blocks` either direction.
- `can_see_plan(uid, plan_id)` — city, audience, block, and host checks; used by `plans`, `plan_members`, `conversations`, `messages` policies.
- `is_admin()`, `is_full_admin()` — read `auth.jwt()` claims and `aal`.

These are the only place visibility logic lives. Policies call them; RPCs call them; tests target them.
