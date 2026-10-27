# Environments

Three environments. Names only; no secret values belong in this repo (S-52 in [security.md](security.md)).

## Overview

| | Local | Staging | Production |
| - | ----- | ------- | ---------- |
| Purpose | Development and tests | Integration, QA, load tests, internal and closed-beta builds | Public users |
| Supabase | `supabase start` (Docker) | Project `yuvomeet-staging`, region `ap-south-1` | Project `yuvomeet-prod`, region `ap-south-1` |
| Admin hosting | `next dev` | Vercel preview, functions region `bom1` | Vercel production, functions region `bom1` |
| Mobile build | EAS `development` profile | EAS `preview` profile | EAS `production` profile |
| SMS | Supabase test OTPs (fixed numbers), hook stubbed | MSG91 live, test DLT template | MSG91 live, production DLT template |
| KYC | HyperVerge stub returning canned verdicts | HyperVerge sandbox | HyperVerge production |
| Rekognition | Stub or a shared dev IAM user | `ap-south-1`, staging IAM user | `ap-south-1`, production IAM user (quota raised) |
| Data | `seed.sql` (Kota, test venues, test users) | Seeded synthetic data; no real users except testers who consent | Real users |
| Analytics | Disabled | PostHog project `yuvomeet-staging` | PostHog project `yuvomeet-prod` |
| Errors | Sentry disabled or dev DSN | Sentry environment `staging` | Sentry environment `production` |

Rules:

- Production data is never copied to staging or local. Staging load tests use synthetic data.
- Migrations flow local → staging → production through CI only. Nobody runs SQL against production by hand except a documented break-glass procedure that writes `audit_log`.
- Production and staging are separate Supabase projects, separate AWS IAM users, separate MSG91 templates, separate PostHog projects. A leaked staging key cannot touch production.

## Region pins

| Component | Region |
| --------- | ------ |
| Supabase (DB, Auth, Storage, Realtime, Edge Functions) | `ap-south-1` (Mumbai) |
| Vercel serverless functions (admin) | `bom1` (Mumbai) |
| Amazon Rekognition | `ap-south-1` |
| HyperVerge | India |
| MSG91 | India |
| LiveKit (P1) | India region / `ap-south-1` |
| PostHog | EU cloud (no PII) |
| Sentry | EU region (scrubbed) |

## Environment variables

`EXPO_PUBLIC_*` values are bundled into the app and are not secrets. Everything else is server-only.

### Mobile (`apps/mobile`, EAS env per profile)

| Name | Notes |
| ---- | ----- |
| `EXPO_PUBLIC_APP_ENV` | `development`, `staging`, `production` |
| `EXPO_PUBLIC_SUPABASE_URL` | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key only (S-2) |
| `EXPO_PUBLIC_POSTHOG_KEY` | |
| `EXPO_PUBLIC_POSTHOG_HOST` | EU host |
| `EXPO_PUBLIC_SENTRY_DSN` | |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | P1 |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | P1 |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Build-time only (injected into the Android manifest via app config); restricted by package and SHA-1 |
| `SENTRY_AUTH_TOKEN` | EAS secret, for source map upload at build time |

### Admin (`apps/admin`, Vercel env)

| Name | Scope |
| ---- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `NEXT_PUBLIC_SENTRY_DSN` | Public |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (server actions) |
| `SENTRY_AUTH_TOKEN` | Build only |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Server only, P1 |

### Edge Functions (Supabase function secrets)

| Name | Used by |
| ---- | ------- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | All (provided by Supabase) |
| `APP_ENV` | All |
| `SEND_SMS_HOOK_SECRET` | `send-sms` |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID`, `DLT_ENTITY_ID` | `send-sms` |
| `OTP_PEPPER` | `send-sms`, `otp-verify` |
| `HYPERVERGE_APP_ID`, `HYPERVERGE_APP_KEY`, `HYPERVERGE_WEBHOOK_SECRET` | `kyc-start`, `kyc-webhook` |
| `KYC_PEPPER` | `kyc-webhook` |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `moderate-image` (and Setu fallback) |
| `EXPO_ACCESS_TOKEN` | `push` |
| `POSTHOG_KEY`, `POSTHOG_HOST` | Server-side events |
| `SENTRY_DSN` | All |
| `ALERT_WEBHOOK_URL` | Cost guard, queue age, severe-report pages |
| `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_SECRET_KEY` | `revenuecat-webhook` (P1) |
| `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | `razorpay-webhook` (P1) |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | `livekit-token` (P1) |
| `SETU_CLIENT_ID`, `SETU_CLIENT_SECRET` | KYC fallback only |

### CI (GitHub Actions secrets)

| Name | Purpose |
| ---- | ------- |
| `SUPABASE_ACCESS_TOKEN` | CLI: migrations, function deploys, type generation |
| `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_PROJECT_REF_PROD` | Targets |
| `SUPABASE_DB_PASSWORD_STAGING`, `SUPABASE_DB_PASSWORD_PROD` | `supabase db push` |
| `EXPO_TOKEN` | EAS builds and updates |
| `VERCEL_TOKEN` | Admin deploys (if not using Vercel Git integration) |
| `SENTRY_AUTH_TOKEN` | Release creation |

### Postgres settings (`private.settings`, not env)

Caps, windows, thresholds, and unit prices live in `private.settings` so they change by migration or admin action, not redeploy. Full list in [data-model.md](data-model.md).

## Supabase project configuration

Applied in both staging and production, recorded in `supabase/config.toml` where the CLI supports it and in a checklist otherwise:

- Auth: phone provider on, Send SMS hook → `send-sms`; custom access token hook → `public.custom_access_token`; email provider on for admins only (sign-ups disabled, admins invited); TOTP MFA on; JWT expiry 3600 s; refresh token rotation on.
- Auth rate limits: OTP send per number and per IP (S-11).
- Storage buckets `quarantine`, `media`, `exports`: all private; file size limit 8 MB; allowed MIME types `image/jpeg`, `image/png`, `image/webp` (exports: `application/json`).
- Extensions: `pg_cron`, `pg_net`, `pgcrypto`, `pg_trgm`, `h3` (or `h3_postgis`; otherwise compute cells in the Edge layer), `pgtap` (local and CI only).
- Realtime: publication on `messages` and `plan_members` only.
- Database: PITR enabled in production; daily backups; network restrictions on direct DB connections to CI IPs.
- Spend cap configured; usage alerts on.

## EAS

`eas.json` profiles:

| Profile | Distribution | Channel | Env | Notes |
| ------- | ------------ | ------- | --- | ----- |
| `development` | internal (APK) | `development` | development | Dev client; points to local or staging Supabase |
| `preview` | internal (APK) | `staging` | staging | Testers and closed beta (also Play internal testing track) |
| `production` | store (AAB) | `production` | production | Built from CI on a release tag only (S-54) |

- Package name: `app.yuvomeet` (placeholder until the final name).
- `runtimeVersion` policy `fingerprint`, so OTA updates only reach binaries with matching native code.
- OTA updates: JS-only fixes to `staging` freely; to `production` only after the same update ran on `staging`. Native changes require a new store build.
- Android: `minSdkVersion 26` (Android 8.0). Target SDK per current Play requirement.
- Play tracks: internal testing (team, 30 friends), closed testing (closed beta, 300 users), production.

## Observability and alerts

Minimum set before the closed beta:

| Signal | Source | Alert |
| ------ | ------ | ----- |
| Crash-free sessions | Sentry | Below 99% over 24 h → alert channel |
| Feed load p95 | Sentry performance span | Above 2 s over 1 h → alert channel |
| Chat delivery p95 | Client span, sampled | Above 1 s over 1 h → alert channel |
| Cold start p75 | Sentry app start | Above 3 s per release → review before rollout |
| Edge Function errors | Sentry + Supabase logs | Error rate above 2% over 15 min on `send-sms`, `otp-verify`, `kyc-webhook`, `check-in` → page |
| OTP delivery | MSG91 delivery reports | Success below 95% over 1 h → page |
| Moderation queue age | `queue_age_tick` | Oldest pending item older than 24 h → page (PRD NFR) |
| Severe report or unsafe-rating review | Trigger → `ALERT_WEBHOOK_URL` | Immediate page; repeat at 8 h if pending |
| SOS pressed | Trigger | Notify on-call admin with plan ID |
| Appeals overdue | Daily job | Digest of appeals older than 24 h |
| Vendor spend | `private.vendor_usage` daily job + vendor budgets | 50%, 80%, 100% of ₹50,000 / month |
| KYC circuit breaker tripped | `kyc-start` | Page |
| Uptime | External monitor on Supabase REST health and admin `/api/health` | Down 2 min → page. Target 99.5% |
| Database | Supabase metrics | CPU above 80% or connections above 80% for 10 min → alert |

The alert channel is a single webhook (`ALERT_WEBHOOK_URL`) pointing to the team's chat channel plus phone push for pages. Who is on call each night and weekend is set in the team's schedule, not in code.
