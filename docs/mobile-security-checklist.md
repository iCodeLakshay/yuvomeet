# Mobile security checklist status

Status of each item in the mobile application security checklist, as of 2026-11-02.
✅ done · ⚠️ partial or needs a manual step · ❌ not done · N/A does not apply.
"Where" names the file or setting that does the work.

## A. Authentication & authorization

| # | Item | Status | Where / notes |
|---|------|--------|---------------|
| 1 | Secure auth and sessions | ✅ | Supabase Auth, phone OTP; session in encrypted MMKV (`src/lib/storage.ts`) |
| 2 | Token checked on every protected request | ✅ | PostgREST + RLS on every table; Edge Functions call `requireUser` |
| 3 | Short-lived access tokens | ✅ | 1 h JWT (Supabase default) |
| 4 | Refresh token rotation | ✅ | Supabase Auth rotation on; refresh only while foregrounded (`src/lib/supabase.ts`) |
| 5 | Revoke sessions on logout | ✅ | `endSession()` calls global `signOut` (`src/features/session/endSession.ts`); suspend/ban revoke server-side (`private.revoke_sessions`) |
| 6 | Handle expired / invalid tokens | ✅ | supabase-js auto-refresh; a 401 `UNAUTHORIZED` from an Edge Function drops the session (`src/lib/functions.ts`) |
| 7 | Block protected screens | ✅ | `Stack.Protected` route groups (`app/_layout.tsx`) |
| 8 | Not only frontend checks | ✅ | Every rule is in RLS or an RPC; pgTAP suite in `supabase/tests` |
| 9 | Backend RBAC | ✅ | `app_role` claim from `custom_access_token`, `require_admin`, aal2 for admins |
| 10 | Ownership checks (IDOR) | ✅ | RLS `user_id = (select auth.uid())`; RPCs check host / member / sender |
| 11 | Lockout for failed logins | ⚠️ | 5 wrong OTPs → 30 min lock in `otp-verify`; calling Auth `/verify` directly is only limited by `token_verifications` |
| 12 | Extra auth for sensitive actions | ✅ | Account deletion needs an emailed code; admin console needs TOTP |
| 13 | Biometrics | N/A | The app has no biometric unlock |
| 14 | Biometric ≠ authorization | N/A | — |
| 15 | Simultaneous / suspicious sessions | ⚠️ | Sign-out ends every device; no new-device alert yet |

## B. Secure data storage

| # | Item | Status | Where / notes |
|---|------|--------|---------------|
| 16 | No secrets in app code | ✅ | Anon key only; `scripts/verify-security-rules.mjs` + gitleaks in CI |
| 17 | Keystore-backed keys | ✅ | MMKV key in expo-secure-store (Android Keystore) |
| 18 | Secure-storage library | ✅ | expo-secure-store |
| 19 | No tokens in plain AsyncStorage | ✅ | AsyncStorage is not used |
| 20 | No sensitive unencrypted DB | ✅ | Only encrypted MMKV |
| 21 | Encrypt local data at rest | ✅ | MMKV encrypted with a random 16-byte key |
| 22 | No sensitive data in logs | ✅ | No `console.*` in app code; Sentry and PostHog scrub PII (`packages/shared/src/analytics.ts`) |
| 23 | Don't persist whole state | ✅ | Only the React Query cache, 24 h max age; no Redux |
| 24 | Clear cache on logout | ✅ | `endSession()`: query cache, persisted cache, chat outbox, MMKV, trusted contact |
| 25 | No Android backups | ✅ | `android.allowBackup: false` (`app.config.ts`) |
| 26 | Clipboard | ✅ | Only "copy message" in chat, by user choice; OTPs and tokens are never copied |
| 27 | Mask sensitive fields | ✅ | No passwords; phone shown only to its owner |
| 28 | Screenshots / recents preview | ❌ | Needs `expo-screen-capture` (native module, new build). Suggested for OTP and payment screens |
| 29 | Minimal personal data on device | ✅ | Trusted contact stays on the device by design; no contacts read |

## C. API & network security

| # | Item | Status | Where / notes |
|---|------|--------|---------------|
| 30 | HTTPS in production | ✅ | `https://<ref>.supabase.co` |
| 31 | Cleartext off in release | ✅ | `usesCleartextTraffic=false` (`plugins/withAndroidHardening.js`); the debug manifest re-enables it for Metro only |
| 32 | Network Security Config | ⚠️ | Cleartext is off through the manifest; no custom config file |
| 33 | Never disable TLS checks | ✅ | Nothing overrides TLS |
| 34 | Trusted CAs | ✅ | System CAs |
| 35 | Certificate pinning | ❌ | Not done on purpose: Supabase rotates certificates; pinning would risk lockouts. Revisit if the threat model changes |
| 36 | Rate limiting | ✅ | OTP lock + Auth limits, `rateLimit()` on payments / checkout / exports, message caps in SQL |
| 37 | Server-side input validation | ✅ | RPCs and `CHECK` constraints; Edge Functions validate ids and bodies |
| 38 | Parameterized queries | ✅ | PostgREST and `format(%I/%L)` in SQL |
| 39 | Injection | ✅ | No dynamic SQL from user input; no shell in functions |
| 40 | Validate responses | ⚠️ | Typed by generated database types; no runtime schema check on Edge Function responses |
| 41 | Timeouts and safe retry | ✅ | 30 s timeout on API and function calls (`src/lib/fetch.ts`); React Query retries only network errors |
| 42 | Payment idempotency | ✅ | `svc_apply_payment` is idempotent; a second payment for a paid seat is refunded; webhook replays dropped |
| 43 | Cancel requests on unmount | ⚠️ | React Query drops results of unused queries, but the HTTP request still finishes (no `signal` passed through) |
| 44 | No internal errors to users | ✅ | Edge Functions return a fixed message for unknown errors (`_shared/http.ts`); app maps errors (`src/lib/errors.ts`) |
| 45 | Webhook signatures | ✅ | Razorpay HMAC, HyperVerge secret, Standard Webhooks for the SMS hook |
| 46 | CORS is not auth | ✅ | Auth is the JWT |

## D. Android platform security

| # | Item | Status | Where / notes |
|---|------|--------|---------------|
| 47 | Minimal permissions | ✅ | Camera, location (foreground), internet; contacts, SMS, call log, mic, background location, overlay and external write blocked |
| 48 | Ask only when needed | ✅ | Camera on photo, location on check-in / SOS |
| 49 | Explain before asking | ✅ | Consent screen + permission strings in `app.config.ts` |
| 50 | exported=false | ✅ | Only `MainActivity` is exported (launcher + `yuvomeet://` links) |
| 51 | Protect exported components | ✅ | No other exported components |
| 52 | Validate deep links | ✅ | Expo Router typed routes; every id is checked by RLS on load |
| 53 | Verified App Links | ❌ | No `https` links yet; add `assetlinks.json` when the domain is live |
| 54 | PendingIntent mutability | ✅ | Handled by expo-notifications (FLAG_IMMUTABLE on Android 12+) |
| 55 | WebView | ✅ | No WebView; verification and payments open in the system browser |
| 56 | Local files / providers | ✅ | No content providers of our own |
| 57 | Validate uploads | ✅ | JPEG only, re-encoded on device, size-limited bucket, Rekognition screening |
| 58 | Shared storage | ✅ | Exports written to the app cache and shared through the share sheet |
| 59 | Backup / extraction rules | ✅ | Backups off (#25) |
| 60 | Notification payloads | ✅ | Generic text and ids only (S-48) |
| 61 | Permission denied / revoked | ✅ | Clear message and fallback (`AppError('PERMISSION')`) |
| 62 | Rooted-device testing | ❌ | Manual test before release |

## E. Backend & business logic

| # | Item | Status | Where / notes |
|---|------|--------|---------------|
| 63 | Logic on the backend | ✅ | RPCs, triggers, Edge Functions |
| 64 | Don't trust client ids / prices | ✅ | `auth.uid()` server-side; price read from `plans` in `payments-checkout` |
| 65 | Verify payments server-side | ✅ | Razorpay link fetched server-to-server; webhook HMAC |
| 66 | Ownership before change | ✅ | See #10 |
| 67 | No user edits to system data | ✅ | No client writes to settings, roles, statuses |
| 68 | Input sanitization | ✅ | Text screening trigger; length checks |
| 69 | RLS | ✅ | All tables; signed-out callers can no longer execute any function (migration `20261102073349`) |
| 70 | Separate admin APIs | ✅ | `admin_*` RPCs need an admin claim + aal2; separate console app |
| 71 | Log admin actions | ✅ | `audit_log`, insert-only |
| 72 | Protect user content | ✅ | Only the sender deletes; admins remove with audit |
| 73 | Upload access control | ✅ | Quarantine bucket per user folder; media read by RLS |
| 74 | Private buckets | ✅ | All buckets private; 60 s signed URLs |
| 75 | No service key in app | ✅ | See #16 |

## F. Integrity & dependencies

| # | Item | Status | Where / notes |
|---|------|--------|---------------|
| 76 | No debugging in release | ✅ | Release builds are not debuggable (Gradle default) |
| 77 | No debug menus / test creds | ⚠️ | Test OTP numbers exist only in `supabase/config.toml` (local). Remove test numbers from the hosted project's Auth settings before launch |
| 78 | R8 shrinking / obfuscation | ✅ | `enableMinifyInReleaseBuilds` + resource shrinking (`plugins/withAndroidHardening.js`). Test a release build once: R8 can strip classes a library needs |
| 79 | Remove unused permissions / modules | ✅ | See #47; unused libraries removed earlier |
| 80 | Dependency scanning | ⚠️ | `pnpm audit --prod`: Next.js RCE fixed (16.4.2). Left: moderate/high DoS issues in build-time tools (`glob`, `minimatch`, `decode-uri-component`, `zod` 3) that do not ship in the app |
| 81 | Keep packages updated | ⚠️ | Expo SDK 57 current; run `pnpm outdated` monthly |
| 82 | Review SDK data collection | ✅ | Sentry (no PII, no replay), PostHog (allow-list, no autocapture, EU) |
| 83 | Signing keys out of the repo | ⚠️ | `*.jks` ignored, but release builds currently sign with the **debug keystore**. Use EAS credentials or a private keystore |
| 84 | CI secrets | ✅ | GitHub secrets only; gitleaks in CI |
| 85 | Play Integrity | ❌ | Optional; consider for payments once traffic grows |
| 86 | Tampering review | ⚠️ | R8 on; all money and access rules are server-side, so a modified app gains nothing |
| 87 | Library / license inventory | ❌ | Generate with `pnpm licenses list --prod` before release |

## Known gaps outside the checklist

- The Supabase project is in Tokyo (`ap-northeast-1`), not Mumbai; the privacy plan says India.
- Leaked-password protection is off in Supabase Auth (affects admin logins): Dashboard → Auth → Password security.
- Payments, payouts, friends, likes and mentions (migrations from 28–31 Oct) have no pgTAP tests yet.
