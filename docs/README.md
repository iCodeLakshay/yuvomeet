# Yuvomeet engineering docs

Yuvomeet (working name) is an Android-first app for verified adults in Kota to find and attend group plans at public venues. The product source of truth is the PRD at the repo root: [PRD — Group Plans App (Kota first).md](<../PRD%20%E2%80%94%20Group%20Plans%20App%20(Kota%20first).md>). Requirement IDs used everywhere in these docs (ON-1, PL-4, SF-3, …) come from that PRD.

These docs settle the open engineering choices and set the P0 build order. P1 and P2 are described only far enough that P0 does not block them.

## Reading order

| # | Doc | Read it to learn |
| - | --- | ---------------- |
| 1 | [architecture.md](architecture.md) | System shape, monorepo, request paths, Postgres vs Edge Function, plan lifecycle |
| 2 | [security.md](security.md) | Rules a reviewer can check: RLS, phone secrecy, women-only, caps, audit, check-in |
| 3 | [data-model.md](data-model.md) | Tables, enums, RLS matrix, indexes |
| 4 | [integrations.md](integrations.md) | What each vendor owns, what we never send, secret names, failure behavior, cost guard |
| 5 | [privacy-and-compliance.md](privacy-and-compliance.md) | DPDP-oriented product rules, retention, consent, Play policy, lawyer checklist |
| 6 | [moderation-and-safety.md](moderation-and-safety.md) | Queue states, SLAs, auto-suspend, appeals |
| 7 | [environments.md](environments.md) | Local, staging, production; region pins; env var names; EAS; alerts |
| 8 | [implementation-plan.md](implementation-plan.md) | P0 slices in build order, PRD IDs each one closes, analytics events |
| — | [../apps/mobile/README.md](../apps/mobile/README.md) | Expo dev builds, USB Android, local APK, EAS builds |
| — | [../apps/admin/README.md](../apps/admin/README.md) | Admin console: sign-in with TOTP, roles, local run |

## Ground rules

- **Stitch owns visuals.** The Stitch project "Yuvomeet Mobile App" defines layout, color and typography. These docs define behavior, data, and routes. Screens without a Stitch frame reuse the same tokens and components.
- **One small design system, no UI kit.** Mobile screens are built from `apps/mobile/src/ui` (React Native `StyleSheet`, tokens in `theme.ts` taken from Stitch: dark surfaces, Inter, white pill buttons, amber accent, Material icons). The admin console mirrors the same tokens in plain CSS. There is no HeroUI, Tailwind or Uniwind.
- **English only.** The app ships in English; there is no i18n layer. Copy lives next to the screen that shows it.
- **The database enforces privacy.** If a rule appears in [security.md](security.md), it is enforced by RLS, a trigger, or an Edge Function, not only by the client. `supabase/tests/security.test.sql` (pgTAP) checks the rules.
- **Personal data stays in India.** Supabase and all processing of personal data run in Mumbai (`ap-south-1`). Exceptions are listed in [integrations.md](integrations.md) and carry no PII.

## P0 boundary

P0 is everything the MVP build (release stage 1) must ship before the closed beta:

- Onboarding and accounts: ON-1 to ON-6
- Verification and AI screening: VR-1 to VR-7
- Plans: PL-1 to PL-6
- Chat: CH-1 to CH-4
- Safety: SF-1 to SF-7
- Free tier and safety-is-free: SB-1, SB-5
- Venues: VN-1
- Admin console: AD-1 to AD-4

Not in P0, but the schema leaves room for them: subscriptions (SB-2 to SB-4), ticketed plans (PL-8), curated tables (PL-7), 1:1 chat and voice notes (CH-5, CH-6), masked calls (VC-1 to VC-4), contact cards (CS-1, CS-2), venue offers and billing (VN-2, VN-4), metrics dashboard (AD-5). P2 (recurring plans, voice rooms, venue dashboard, people nearby, second city) is out of scope for these docs except where noted.

## Route inventory

Route names follow Expo Router file conventions under `apps/mobile/app`. `(group)` folders are layout groups and do not appear in URLs; `app/_layout.tsx` mounts exactly one of `(auth)`, `(onboarding)`, `(app)` or `suspended` from the session state (`Stack.Protected`). "Sheet" rows are native form sheets. The Stitch frame column names the frame each screen follows; "—" means no frame exists and the screen is composed from the shared components.

### Sign in (`(auth)`)

| Route | Purpose | Stitch frame | PRD |
| ----- | ------- | ------------ | --- |
| `(auth)/index` | Welcome carousel | Minimal Landing | — |
| `(auth)/age` | 18+ statement before sign-up | Onboarding: Age Verification | VR-1 |
| `(auth)/phone` | Phone number entry (OTP only, no passwords) | Welcome Back Login | ON-1 |
| `(auth)/otp` | OTP entry, resend timer, lockout state | OTP Verification | ON-1 |

### Onboarding (`(onboarding)`)

| Route | Purpose | Stitch frame | PRD |
| ----- | ------- | ------------ | --- |
| `consent` | Purpose-specific consent, nothing pre-ticked | — | Privacy §5 |
| `city` | City picker | Location & City Waitlist | ON-2 |
| `waitlist` | Non-live city: waitlist confirmation | Location & City Waitlist | ON-2 |
| `profile` | First name, gender, area, college | Let's Get to Know You | ON-3 |
| `photos` | 2–6 photos, moderated (pending / rejected per photo) | Add a Profile Photo | ON-3, VR-4 |
| `interests` | Interest picker | Onboarding: Interests | ON-3 |
| `rules` | Community rules and acceptance | — | ON-4 |

### Main app (`(app)`)

| Route | Purpose | Stitch frame | PRD |
| ----- | ------- | ------------ | --- |
| `(tabs)/index` | Discover feed: search, categories, plan cards | Discover Home, Discover Empty States | PL-2, ON-5 |
| `(tabs)/plans` | Hosted, joined, pending, past | My Plans | PL-5 |
| `(tabs)/chats` | Plan group chats | — | CH-1 |
| `(tabs)/account` | Own profile, verification, weekly caps, settings | Public Member Profile (layout) | — |
| `notifications` | Activity feed with category filters | Notifications Center, Notifications Empty State | — |
| `filters` (sheet) | Day, area, audience filters | — | PL-2 |
| `verify-gate` (sheet) | Verify before joining or hosting | — | ON-5 |
| `plan/[id]` | Plan detail, state-aware CTA, SOS, share | Plan Details | PL-3, PL-4, SF-2 |
| `plan/[id]/join` (sheet) | Note to host, weekly cap, request or instant join | Join Plan States | PL-3 |
| `plan/[id]/requests` | Host reviews requests; who is going | — | PL-3 |
| `plan/[id]/check-in` | One-fix GPS check-in | — | PL-6 |
| `plan/[id]/rate` | Private "showed up" / "felt safe" | — | SF-4 |
| `plan/[id]/cancel` (sheet) | Host cancel with late-cancel warning | — | PL-5 |
| `plan/new` | Create a plan (2 steps) | Create a Plan | PL-1, SF-6 |
| `plan/venue` (sheet) | Pick from approved venues | — | PL-1, SF-1 |
| `chat/[id]` | Group chat; muted and closed states; photos blurred until tapped | Group Chat | CH-1 to CH-3 |
| `chat/[id]/members` | Plan, members, safety shortcuts | — | CH-1 |
| `report` (sheet) | Report and optional block | Report & Block Drawer, Safety Report Sheet | CH-4, SF-7 |
| `user/[id]` | Member profile: badge, interests, aggregates only | Public Member Profile | PL-3, VR-7 |
| `verify` | Why and how we verify; starts the HyperVerge web flow | — | VR-1 to VR-3 |
| `verify/result` | Verified, checking, manual review, not passed, under 18 | Under-18 Restriction | VR-1, VR-2, VR-7 |
| `venues`, `venues/[id]` | Approved venues; detail with static map | — | VN-1 |
| `safety/contact` | Trusted contact (device only) | — | SF-2 |
| `safety/sos` (sheet) | Call 112 or send one location fix by WhatsApp | — | SF-3 |
| `settings/profile` | Edit profile and photos | — | ON-3 |
| `settings/privacy` | Consents, data export | — | ON-6, Privacy §5 |
| `settings/blocked` | Blocked members | — | CH-4 |
| `settings/appeals` | My appeals and answers | — | VR-6 |

### Account (`(account)`, any signed-in state) and restricted

| Route | Purpose | PRD |
| ----- | ------- | --- |
| `appeal` | Appeal a verification, suspension or ban | VR-6 |
| `delete-account` | Delete account, with export first | ON-6 |
| `help` | Rules, 112, support and policy links | Privacy §5 |
| `suspended` | Suspended or banned: reason and appeal | VR-5, VR-6 |

Stitch frames not built on purpose: "Forgot Password / Recovery" (sign-in is OTP only) and the iOS "Liquid Glass" home (Android-first; the dock follows its layout).

### Admin web console (`apps/admin`)

| Route | Purpose | PRD |
| ----- | ------- | --- |
| `/login`, `/mfa` | Email and password, then TOTP (aal2) | S-44 |
| `/queue` | Review queue: open, severe, escalated, mine, decided | AD-1, SF-7 |
| `/queue/[id]` | Item detail with context (photo, text, checks, report thread, ratings); claim, approve, reject, escalate | AD-1 |
| `/users` | Search by first name or user ID | AD-2 |
| `/users/[id]` | Record, photos, reports, checks, hosted plans, action history; suspend, ban, restore, gender, role | AD-2, AD-3 |
| `/plans/[id]` | Plan, members, chat; cancel, remove, mute, remove message | AD-2 |
| `/venues`, `/venues/[id]` | Venue list; create, edit, approve, archive (admin only) | AD-4, VN-1, SF-1 |
| `/cities` | City status and waitlist counts (admin only) | AD-4 |
| `/appeals` | Appeals with 48 h due time; uphold or keep, with a written response | VR-6 |
| `/audit` | Read-only audit log | AD-3 |
| `/metrics` | Metrics dashboard (P1) | AD-5 |

## Open product questions that affect engineering

Tracked in the PRD. The docs are written so that none of these change the schema:

- Final name and domain: only display strings, bundle ID, and deep-link host change.
- Gender-based price: prices live in Play products, not code ([integrations.md](integrations.md)).
- Part-time moderator: the admin role model already supports more than two reviewers.
