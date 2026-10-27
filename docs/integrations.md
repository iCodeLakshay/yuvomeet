# Integrations

For each vendor: what it owns, what we must never send it, where its secret lives, and what the app does when it fails. Secret names are listed again by environment in [environments.md](environments.md). Rules referenced as S-n are in [security.md](security.md).

Residency rule: personal data (phone, name, photos, ID results, message text, location) is processed only in India. Vendors outside India receive a pseudonymous user ID and technical data at most, and are marked **non-India, no PII** below.

## Summary

| Vendor | Phase | Owns | Region | Called from |
| ------ | ----- | ---- | ------ | ----------- |
| Supabase | P0 | Postgres, Auth, Realtime, Storage, Edge Functions, cron | `ap-south-1` Mumbai | App, admin, Edge |
| MSG91 | P0 | OTP SMS delivery on DLT routes | India | `send-sms` Edge Function |
| HyperVerge | P0 | Age (DigiLocker / Aadhaar offline eKYC), liveness, face match, gender signal | India | App SDK + `kyc-start`, `kyc-webhook` |
| Amazon Rekognition | P0 | Image moderation labels | `ap-south-1` | `moderate-image` Edge Function |
| Expo / EAS | P0 | Builds, OTA updates, push relay | Push relay non-India, no PII in payload | CI, `push` Edge Function |
| Google Maps SDK | P0 | Map tiles for venue pins | Device → Google | App (`react-native-maps`) |
| PostHog | P0 | Product analytics | EU, non-India, no PII | App, admin |
| Sentry | P0 | Crash and performance | EU, non-India, scrubbed | App, admin, Edge |
| Vercel | P0 | Admin hosting | Functions pinned `bom1` | — |
| WhatsApp | P0 | Trusted-contact share and SOS | Device only | App deep link |
| RevenueCat + Google Play Billing | P1 | Plus / Premium subscriptions | Non-India, user ID only | App SDK, `revenuecat-webhook` |
| Razorpay | P1 | Ticket checkout, venue invoices, GST invoices | India | Admin server, app checkout, `razorpay-webhook` |
| LiveKit | P1 | WebRTC voice calls, no recording | India region (LiveKit Cloud Mumbai or self-hosted in `ap-south-1`) | App SDK, `livekit-token` |

Rejected for P0: Stream and Sendbird chat (would copy message text to a non-India vendor; Supabase Realtime meets the 1-second target at our scale), WhatsApp Business API (we never send messages on a user's behalf), Firebase Auth (would split identity from Supabase).

## Supabase

- **Owns:** all product data, auth (phone OTP for users, email + TOTP for admins), Realtime chat, Storage (`quarantine`, `media`, `exports` buckets, all private), Edge Functions, `pg_cron`, `pg_net`.
- **Never send:** nothing excluded; it is the system of record. Still, never store data S-39 forbids.
- **Secrets:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public, in app), `SUPABASE_SERVICE_ROLE_KEY` (Edge and admin server only), `SUPABASE_JWT_SECRET` (not used by app code; Supabase-managed).
- **Plan:** Pro plan or above before closed beta (daily backups, PITR add-on, no project pausing). Compute sized to pass the staging load test in [architecture.md](architecture.md).
- **Failure:** outage means the app is read-only from cache (React Query persistence) and chat messages queue in MMKV. The app shows an offline banner. No fallback backend.

## MSG91 (SMS)

- **Owns:** delivering the OTP text that Supabase generates. Supabase Auth Send SMS hook → `send-sms` → MSG91 Flow / OTP API with the DLT-registered template.
- **Never send:** anything but the phone number and the OTP. No user ID, name, or app data.
- **Secrets:** `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID`, `DLT_ENTITY_ID`, `SEND_SMS_HOOK_SECRET` (verifies the hook call came from Supabase), `OTP_PEPPER` (S-8).
- **Pre-launch:** DLT entity and header registration, OTP template approval. This takes days to weeks; start in the foundations slice.
- **Failure:** if MSG91 returns an error or times out (5 s), `send-sms` retries once, then returns an error so the app shows "Couldn't send code, try again". Secondary SMS provider is a P1 consideration; measure ON-1's 30-second delivery in staging before deciding. Track delivery latency with MSG91 delivery reports.

## HyperVerge (KYC)

- **Owns:** VR-1 (DigiLocker or Aadhaar offline eKYC → age), VR-2 (liveness and face match against profile photo), VR-3 (gender signal from ID and selfie).
- **Flow:** app calls `kyc-start` → function creates a HyperVerge transaction tied to our user ID and returns a short-lived SDK token → app runs the HyperVerge SDK (DigiLocker redirect or offline XML, then selfie) → HyperVerge posts results to `kyc-webhook` → function writes `verification_checks` and updates `profiles` (S-38).
- **Store:** verdict, score, birth year, verified gender, provider transaction reference, `id_fingerprint` (S-39). **Never store:** Aadhaar number, ID image, selfie, name on ID, full DOB, address. The webhook handler drops those fields before anything is logged.
- **Face match source:** the user's first approved profile photo is passed by signed URL (60 s) for comparison; HyperVerge must not retain it beyond the check (contract term).
- **Thresholds:** pass / review / fail cut-offs on face match and liveness scores live in `private.settings` and are tuned on beta data. Borderline → `manual_review` and a queue item (VR-2).
- **Secrets:** `HYPERVERGE_APP_ID`, `HYPERVERGE_APP_KEY`, `HYPERVERGE_WEBHOOK_SECRET`, `KYC_PEPPER`.
- **Contract checks before signing:** data processed and stored in India; retention of images zero or minimal and stated in days; DPA in place; per-check price and price for failed checks.
- **Failure:** SDK error or provider outage → result screen says "Verification is temporarily unavailable; you can browse plans meanwhile" and offers retry later. Does not consume the user's retry (VR-2). Webhook missing after 15 minutes → `kyc-start` status poll by the function; still missing after 1 hour → manual review item.
- **Fallback if onboarding slips:** Setu DigiLocker (about ₹4 per success) for age and gender from the ID document, plus Rekognition `CompareFaces` in `ap-south-1` for selfie vs profile photo, plus a passive liveness step in the app. Same `verification_checks` rows with `provider = 'setu'` / `'rekognition'`. No schema change.

## Amazon Rekognition

- **Owns:** `DetectModerationLabels` for every uploaded image (profile, chat, venue). In the Setu fallback, also `CompareFaces`.
- **Region:** `ap-south-1` only. Images are sent as bytes from the `quarantine` object, not stored in S3.
- **Never send:** user ID, names, or any metadata. Only image bytes.
- **Rules:** labels in the explicit-nudity, violence, hate-symbol, and drug categories above the confidence threshold → `rejected`; between review and reject thresholds → queue; below → `approved`. Thresholds in `private.settings`. Profile photos also require at least one face (`DetectFaces`) so photos of objects are held.
- **Quota:** default 5 TPS in `ap-south-1`. Request an increase before public launch; until then `moderate-image` processes a queue with backoff, so bursts delay rather than fail.
- **Secrets:** `AWS_REGION=ap-south-1`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` for an IAM user limited to `rekognition:DetectModerationLabels`, `rekognition:DetectFaces`, `rekognition:CompareFaces`.
- **Cache:** `private.media_moderation` keyed by SHA-256 of the re-encoded image. The same image is never checked twice.
- **Failure:** on error or throttling after 3 retries over 2 minutes, the image stays `pending` (not visible to others) and a queue item is created. Never fail open.

## Expo / EAS

- **Owns:** development, preview, and production builds; OTA updates (JS-only changes); push delivery through Expo Push Service to FCM.
- **Never send:** message text, names, or anything beyond S-48's generic push copy. Push payload data holds only IDs (`plan_id`, `conversation_id`).
- **Secrets:** `EXPO_ACCESS_TOKEN` (CI and `push` function), FCM server credentials uploaded to EAS. Build-time env: `EXPO_PUBLIC_*` only (S-2).
- **Failure:** push is best-effort. Every push-worthy event also appears in an in-app activity badge on next open. Invalid tokens (`DeviceNotRegistered`) are deleted from `push_tokens`.

## Google Maps SDK (Android)

- **Owns:** map tiles for venue detail and the venue picker.
- **Never send:** user location to our maps calls. Maps show venue pins; the "my location" layer is off. (The device's own location is used only for check-in and SOS, and never on the map.)
- **Secrets:** `GOOGLE_MAPS_ANDROID_API_KEY`, restricted to the app's package name and signing SHA-1, set at build time in EAS.
- **Failure:** map area shows the venue address and an "Open in Maps" link.

## PostHog (EU)

- **Owns:** product analytics events listed in [implementation-plan.md](implementation-plan.md), funnels, retention.
- **Non-India, no PII.** `distinct_id` is the Supabase user ID. Event properties come from an allow-list in `packages/shared` (city slug, plan ID, activity, audience, counts, durations). No names, phone, photos, free text, coordinates, gender of a specific user, or KYC details. Autocapture and session replay off.
- **Secrets:** `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` (EU host).
- **Failure:** events dropped silently. Never block UI.

## Sentry

- **Owns:** crash reporting and performance spans (feed load, chat delivery, cold start) for app, admin, and Edge Functions.
- **Non-India, scrubbed.** `beforeSend` removes request bodies, query strings, breadcrumbs with text input, and any field named like phone, body, bio, name, lat, lng. User context is `{ id }` only. Session replay off.
- **Secrets:** `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` (admin, Edge), `SENTRY_AUTH_TOKEN` (CI, source maps).
- **Failure:** silent.

## WhatsApp deep link

- **Owns:** SF-2 trusted-contact sharing and SF-3 SOS, by opening WhatsApp with a prefilled message to the contact stored on the device.
- **Never send:** anything server-side. No Business API. The server never learns the contact's number or the location.
- **Failure:** if WhatsApp is not installed, fall back to the Android share sheet (SMS or any app) with the same text. SOS always shows 112 regardless.

## RevenueCat + Google Play Billing (P1)

- **Owns:** Plus and Premium (SB-2 to SB-4): purchase, restore, renewal, cancellation at period end.
- **Products:** `plus_women` (₹99/month), `plus_men` (₹199/month), `premium` (₹499/month), mapped to RevenueCat entitlements `plus` and `premium`. The app offers the Plus product matching `verified_gender`; `other` sees `plus_men` pricing unless the open pricing question decides otherwise. Changing prices is a Play Console change, not a code or schema change.
- **Never send:** anything but the Supabase user ID as RevenueCat `app_user_id`.
- **Secrets:** `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (public SDK key), `REVENUECAT_WEBHOOK_AUTH` (bearer the webhook checks), `REVENUECAT_SECRET_KEY` (server-side lookups).
- **Truth:** `revenuecat-webhook` writes `subscriptions` and `profiles.entitlement`. The app's local purchase result is never trusted for caps.
- **Failure:** webhook delayed → user keeps their previous entitlement until it arrives; the app can trigger a server re-sync through the function. Safety features never depend on entitlement (S-30).

## Razorpay (P1)

- **Owns:** PL-8 ticket checkout (in-person service, so not Play Billing), refunds when a host cancels, commission recording; VN-4 monthly venue invoices with GST.
- **Never send:** profile data beyond what checkout needs. Customer contact fields are left for the user to fill in Razorpay checkout; we do not pass the phone from Auth.
- **Secrets:** `RAZORPAY_KEY_ID` (public, checkout), `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- **Truth:** only `razorpay-webhook` (signature verified) marks a ticket paid or refunded.
- **Pre-launch:** GST registration and invoice format confirmed with a CA.
- **Failure:** payment pending → seat held for 10 minutes then released.

## LiveKit (P1)

- **Owns:** VC-1 to VC-3 one-to-one voice over WebRTC.
- **Rules:** `livekit-token` checks VC-2 (both accepted, 10 messages exchanged, shared completed plan or accepted chat, no block, calls not disabled) before minting a short-lived token for a room named by a random ID. Recording and egress are disabled at the project level. `calls` stores time, duration, participants only (VC-4).
- **Secrets:** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
- **Failure:** call fails with a retry button; chat stays available.

## Cost guard

Target from the PRD: budget alert at ₹50,000 a month.

- **Ledger:** every billable vendor call (SMS, KYC check, Rekognition call, LiveKit minute) increments `private.vendor_usage (vendor, day, units)` in the same function that makes the call. Unit prices live in `private.settings`.
- **Alert:** a daily `pg_cron` job estimates month-to-date spend from the ledger and posts to the ops alert channel at 50%, 80%, and 100% of ₹50,000. Vendor dashboards' own budget alerts are also set (AWS Budgets on the Rekognition account, Supabase spend cap).
- **Cache rules so retries do not rebill:**
  - KYC: a user with a `pass` verdict for a check type is never sent again for it. A failed liveness gets one retry (VR-2); after that it goes to manual review, not another paid check. `id_fingerprint` lookups stop a second account re-running KYC on the same ID.
  - Verification is triggered only at first plan join or host attempt, not at sign-up (PRD risk mitigation).
  - Images: `private.media_moderation` by SHA-256.
  - SMS: S-11 resend limits.
- **Circuit breaker:** if daily KYC starts exceed `kyc_daily_cap` (setting, initially 300), new starts get "Verification is busy, try in a few hours" and an alert fires. This bounds the worst case of a bot or abuse spike.
