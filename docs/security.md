# Security

Every rule below is written so a reviewer can check it against a migration, a policy, or a function. "Enforced by" names where the check lives. If a rule is only in the client, it is a bug.

Table and column names match [data-model.md](data-model.md).

## 1. Access model

| Actor | Credential | Can reach |
| ----- | ---------- | --------- |
| Mobile app | Supabase anon key + user JWT | PostgREST, RPCs, Realtime, Storage, Edge Functions, all through RLS |
| Admin console (browser) | Admin user JWT with `app_role` claim | PostgREST and RPCs through admin RLS policies |
| Admin console (server actions, `bom1`) | Service role key | Only for actions RLS cannot express; each writes `audit_log` |
| Edge Functions | Service role key + per-vendor secrets in function env | Vendor APIs; tables via service role after verifying the caller |
| Vendor webhooks | Shared signing secret per vendor | One Edge Function each; signature verified before any write |

Rules:

- **S-1** RLS is enabled on every table in `public`. Enforced by a CI check that fails if `pg_tables` has a `public` table with `rowsecurity = false`.
- **S-2** The mobile app ships with the anon key only. The service role key and every vendor secret live in Edge Function or Vercel server env. Enforced by a CI grep on `apps/mobile` for `service_role` and known secret prefixes, and by EAS env config containing only `EXPO_PUBLIC_*` values.
- **S-3** Tables that must never be readable by clients (`otp_attempts`, raw provider references, cost counters) live in the `private` schema, which is not exposed through PostgREST.
- **S-4** All `security definer` functions set `search_path = ''` and fully qualify names. Each starts by reading `auth.uid()` and rejects null.

## 2. Phone number secrecy

- **S-5** The phone number exists only in `auth.users.phone`. No table in `public` has a phone column. Enforced by CI check on `information_schema.columns` for names matching `phone|mobile|msisdn` outside `auth`.
- **S-6** No view, RPC, or Edge Function returns `auth.users.phone` to a client, including the user themselves (the app keeps the number it typed in local state during sign-in only).
- **S-7** The phone leaves Auth only through the Send SMS hook to MSG91. The OTP-verify Edge Function receives the number from the app transiently and does not log or store it.
- **S-8** The OTP lockout counter (`private.otp_attempts`) is keyed by `HMAC-SHA256(phone, OTP_PEPPER)`, not the number.
- **S-9** Analytics (PostHog) and crash reports (Sentry) receive the Supabase user ID only. Never phone, name, photo URL, bio, message text, coordinates, or KYC data. Enforced by a Sentry `beforeSend` scrubber and a PostHog wrapper that accepts only allow-listed event properties from `packages/shared`.

## 3. OTP and session

- **S-10** ON-1 lockout: 5 wrong OTP entries for a number lock it for 30 minutes. Enforced by the `otp-verify` Edge Function, which checks `private.otp_attempts` before calling Supabase `verifyOtp`, increments on failure, and resets on success. The `send-sms` hook refuses to send while the number is locked. This is in addition to Supabase's own rate limits.
- **S-11** OTP send is limited to 1 per 60 seconds and 5 per hour per number (Supabase Auth settings plus the hook).
- **S-12** JWT expiry 1 hour; refresh token rotation on. Suspending or banning a user revokes all refresh tokens (admin server action calls `auth.admin.signOut(user, 'global')`).
- **S-13** A suspended or banned user can still authenticate so they can see why and appeal, but every RLS policy except own-profile read, `appeals` insert, and account deletion requires `profiles.status = 'active'`. Helper: `public.is_active(uid)`.

## 4. Visibility rules

- **S-14** City scope: a user reads plans and venues only in `profiles.city_id`. Users in a non-live city see no plans.
- **S-15** Women-only (PL-4): a plan with `audience = 'women_only'` returns zero rows to anyone for whom `public.is_verified_woman(auth.uid())` is false. This applies to feed queries, fetch by ID, joins through `plan_members`, conversations, and deep links. The host and admins are the only exceptions. There is no "you don't have access" response that confirms the plan exists; the app shows "plan not found".
  - `is_verified_woman(uid)` is true only when `profiles.verification_status = 'verified'` and `profiles.verified_gender = 'woman'`. Declared gender alone never counts.
- **S-16** Same-college plans are visible only to users with the same `college_id`. In P0 college is self-declared and admin-correctable; the create-plan screen says so. (Verified college email is a later option.)
- **S-17** Blocks (CH-4): if A blocks B, then for both A and B the other's plans, profile, join requests, and messages return zero rows. If A hosts a plan B is in, B is removed. If both are members of a third person's plan, each stops seeing the other's messages; neither is removed. B is never told. Enforced by `public.is_blocked_between(a, b)` used in RLS on `profiles`, `plans`, `plan_members`, `messages`.
- **S-18** Profiles visible to other users expose only: first name, age band (computed from birth year: 18–20, 21–24, 25–30, 30+), verified badge, interests, languages, area name, approved photos, and aggregate stats (plans attended, show-up rate when ≥ 3 plans). Never birth year, gender verification details, ratings given, reports, or `area_cell`. Enforced by a `public_profiles` view with `security_invoker = on` over column-restricted grants.
- **S-19** Ratings (`ratings`), reports, `verification_checks`, `moderation_queue`, and `audit_log` are readable only by admins. The rater can insert a rating but cannot read it back after submission.

## 5. Text and image screening

- **S-20** VR-4 / CH-3: a `before insert or update` trigger `screen_text` on `messages.body`, `profiles.bio`, `profiles.first_name`, and `plans.title` / `plans.description`:
  - Rejects or redacts Indian phone numbers (including spaced, dotted, Devanagari-digit, and number-word variants such as "nine eight…"), URLs, email addresses, and social handles (`@name`, "insta", "snap", "telegram", "wa.me").
  - Holds text matching the abusive or sexual word lists (Hindi, Hinglish, English) by setting `status = 'held'` and enqueueing a `moderation_queue` item. Held text is visible only to its author, shown as "pending review".
  - Word lists live in `private.screen_terms` so admins can update them without a deploy.
- **S-21** Photos (profile, chat, venue) upload to the private `quarantine` bucket via a signed upload URL. The `moderate-image` Edge Function runs Rekognition `DetectModerationLabels`; on pass it copies the object to `media` and marks the row `approved`; on fail it marks `rejected` and enqueues review; borderline goes to the queue. Nothing in `quarantine` is readable by any client except the uploader's own pending preview.
- **S-22** Images are served only through signed URLs with a 60-second expiry. No bucket is public. Venue photos use the same path; their URLs are just longer-cached on the client.
- **S-23** Chat photos are delivered blurred and revealed on tap (CH-2). The blur is a client rendering choice; the server-side guarantee is S-21.
- **S-24** Uploads are limited to JPEG, PNG, and WebP, 8 MB, re-encoded server-side to strip EXIF (including GPS) before moving to `media`.

## 6. Caps and rate limits

All caps are enforced in SQL, read from `private.settings`, and counted in `usage_counters` (period-keyed, so no scan of history). Weeks start Monday 00:00 Asia/Kolkata; days start 00:00 Asia/Kolkata.

| ID | Rule | Enforced by |
| -- | ---- | ----------- |
| S-25 | Free tier: 2 plan joins per week (SB-1). A join request takes a slot; a decline, expiry, or withdrawal before approval returns it. | `request_join` RPC |
| S-26 | Free tier: 1 hosted plan per week (PL-1). A plan cancelled more than 3 hours ahead returns the slot. | `create_plan` RPC |
| S-27 | New accounts (first 7 days after `profiles.created_at`): 5 join requests per day and 20 messages per day (SF-5). | `request_join` RPC, `enforce_message_caps` trigger |
| S-28 | All accounts: 30 messages per minute per sender; 10 reports per day; 20 join requests per day. | Triggers / RPCs |
| S-29 | Paid entitlements (P1) lift S-25 and S-26 only. S-27 and S-28 apply to everyone. | `profiles.entitlement` read by the RPCs |
| S-30 | Safety is never gated (SB-5): report, block, leave, SOS, trusted contact, check-in, and masking never check entitlement or caps other than S-28's abuse limit on reports. | Code review checklist item |

Edge Functions also apply per-user limits (sliding window in `private.edge_rate`): `check-in` 10 per hour, `kyc-start` 5 per day, `export-data` 3 per day.

## 7. Plan creation rules

- **S-31** PL-1: venue must be `status = 'approved'` in the user's city; capacity 3–10; `starts_at >= now() + 3 hours`.
- **S-32** PL-1 / SF-6: `ends_at` must be at or before 21:00 Asia/Kolkata on the start date, unless `venues.late_events_allowed = true` (partner venue override set by an admin). `ends_at > starts_at` and duration at most 6 hours.
- **S-33** Only verified users can create plans, request joins, or post messages (ON-5). Unverified users can read the feed and plan detail (except S-15/S-16 rows).
- **S-34** `women_only` plans can be created only by verified women.
- **S-35** Clients never write `plans.status`, `plan_members.status`, `checked_in_at`, `verified_at`, `verification_status`, `verified_gender`, `entitlement`, or `profiles.status`. Column grants exclude them; RPCs and Edge Functions set them.

## 8. Check-in

- **S-36** PL-6: the app sends one GPS fix (lat, lng, accuracy) to `check-in`. The function accepts it only if the caller is an approved member, `now()` is within 30 minutes either side of `starts_at`, reported accuracy is ≤ 100 m, and the haversine distance to the venue pin is ≤ 150 m. On success it sets `plan_members.checked_in_at`. The coordinate is never written to a table or log.
- **S-37** Mock-location flag from Android (`mocked: true` in `expo-location`) rejects the check-in with a retry message. This raises the bar; it is not proof.

## 9. Verification

- **S-38** VR-1: KYC runs through HyperVerge from a session minted by `kyc-start`. Only the webhook (`kyc-webhook`, signature verified) writes verdicts. The app's own "success" callback is ignored for state.
- **S-39** We store: verdict, score, birth year, verified gender, provider reference, and an `id_fingerprint` (HMAC of HyperVerge's stable document reference with `KYC_PEPPER`) used to stop one ID backing two accounts and to stop a banned minor from returning with a new number. We never store the Aadhaar number, the ID image, the selfie after the check, full name from the ID, or full date of birth.
- **S-40** Under-18 verdict sets `verification_status = 'blocked_minor'` and `status = 'banned'`, revokes sessions, and schedules data purge except the fingerprint and the ban record. An appeal is accepted only on the ground that the result is wrong (for example, the provider misread the ID); a confirmed under-18 result is final (VR-1).
- **S-41** VR-7: the verified badge, joins, hosting, and chat require all three checks passed: `id_age`, `liveness_face`, `gender` (or their manual-review approvals).
- **S-42** Declared gender can be changed only by an admin through support (VR-3), which writes `audit_log`.

## 10. Admin

- **S-43** The admin role comes from a Supabase custom access token hook that reads `private.admin_roles` and sets the `app_role` claim to `reviewer` or `admin`. Clients cannot write `private.admin_roles`. Roles: `reviewer` (queue, appeals, user lookup, suspend) and `admin` (everything, including ban, restore, cities, venues, role grants).
- **S-44** Admin accounts require TOTP MFA (`aal2`). Admin RLS policies check `auth.jwt() ->> 'aal' = 'aal2'` as well as the role.
- **S-45** Every suspend, ban, restore, queue decision, appeal decision, venue approval, city status change, gender change, and role change inserts an `audit_log` row with `admin_id`, `action`, `subject_type`, `subject_id`, `reason` (required, non-empty), and `created_at`. The insert happens in the same transaction as the action.
- **S-46** `audit_log` is insert-only: no `update` or `delete` grant for any role, plus a trigger that raises on update or delete. Retention purges (if ever needed) run as a migration, not from the app.
- **S-47** Admins viewing KYC evidence see scores and reason codes, not ID images (we do not have them, see S-39).

## 11. Push notifications

- **S-48** Push payloads carry no message text or names for chat; the notification says "New message in <plan title>" and the app fetches content after unlock. Plan titles pass S-20.
- **S-49** `push_tokens` rows are readable and writable only by their owner; the `push` function reads them with service role.

## 12. Trusted contact and SOS

- **S-50** The trusted contact's name and number are stored only on the device in `expo-secure-store`. The server never receives them (SF-2).
- **S-51** "Share plan" and SOS open a WhatsApp compose link (`whatsapp://send?phone=…&text=…`) on the device. SOS includes one location link built on-device from a single GPS fix and shows the 112 helpline (SF-3). The server logs only that SOS was pressed (event `sos_pressed`, user ID, plan ID), never the location.

## 13. Secrets and dependencies

- **S-52** Secret names are listed in [environments.md](environments.md). Values live in Supabase function secrets, Vercel env, and EAS secrets. No secret in git; `gitleaks` runs in CI.
- **S-53** Webhooks verify signatures and reject replays older than 5 minutes (timestamp check) and duplicate event IDs (`private.webhook_events`).
- **S-54** Dependabot (or Renovate) on; lockfile committed; EAS builds from CI only for production.

## Review checklist

A PR touching auth, RLS, RPCs, Edge Functions, or storage must state which S-rules it affects and include a pgTAP test or Edge Function test for each. Minimum pgTAP suite before closed beta:

- Men and unverified women get zero rows for a women-only plan by ID and in the feed.
- Blocked pairs cannot see each other's plans, profile, or messages.
- Third join request in a week fails for a free user; a declined request returns the slot.
- 21st message on day 3 fails for a new account; succeeds on day 8.
- Plan starting in 2 h 59 m fails; ending at 21:01 fails unless the venue override is set.
- Client update of `plans.status` or `profiles.verification_status` fails.
- `audit_log` update and delete fail for every role.
- No `public` column matches the phone pattern.
