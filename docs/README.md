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
| — | [../apps/mobile/README.md](../apps/mobile/README.md) | Expo dev server, USB Android, local APK, EAS builds |

## Ground rules

- **Stitch owns visuals.** These docs define behavior, data, and routes. They do not define layout, color, typography, or component styling. Each Stitch frame is named with a route ID from the inventory below so that design and code line up one-to-one.
- **HeroUI is the component source.** Mobile screens are built from HeroUI Native; the admin console from HeroUI React v3. Each is read through its MCP (`get_docs`, then `get_component_docs`). HeroUI Native is never used in the admin web app.
- **The database enforces privacy.** If a rule appears in [security.md](security.md), it is enforced by RLS, a trigger, or an Edge Function, not only by the client.
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

## Route inventory (Stitch frame IDs)

Route names follow Expo Router file conventions. `(group)` folders are layout groups and do not appear in URLs. Each row is one Stitch frame unless marked "sheet" (a bottom sheet over the parent route) or "state" (a variant of its parent frame).

### Mobile: entry

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `(entry)/splash` | Session check, routes to feed or onboarding | — |
| `(entry)/city` | City picker | ON-2 |
| `(entry)/city-waitlist` | Non-live city: waitlist confirmation | ON-2 |
| `(entry)/phone` | Phone number entry | ON-1 |
| `(entry)/otp` | OTP entry, resend timer, lockout state | ON-1 |
| `(entry)/otp-locked` (state) | Locked for 30 minutes after 5 wrong tries | ON-1 |
| `(entry)/consent` | Purpose-specific consent: location, camera, notifications | Privacy §5 |
| `(entry)/rules` | Community rules summary and tick box | ON-4 |

### Mobile: profile

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `(profile)/create` | First name, gender, bio, languages, area | ON-3 |
| `(profile)/photos` | Upload 2–6 photos; pending/rejected states per photo | ON-3, VR-4 |
| `(profile)/interests` | Interest picker | ON-3 |
| `(profile)/edit` | Edit own profile | ON-3 |
| `user/[id]` | Another user's profile: badge, interests, aggregates only | PL-3, VR-7 |

### Mobile: verification

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `(verify)/intro` | Why we verify, what we store, what we never store | VR-1 |
| `(verify)/id-check` | DigiLocker / Aadhaar offline eKYC handoff | VR-1 |
| `(verify)/selfie` | Liveness and face match capture | VR-2, VR-3 |
| `(verify)/result` | Pass, retry, manual review (with expected reply time), or blocked | VR-1, VR-2, VR-7 |
| `(verify)/appeal` | Appeal a rejection | VR-6 |

### Mobile: plans

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `(tabs)/feed` | City-scoped plan feed | PL-2, ON-5 |
| `(tabs)/feed/filters` (sheet) | Day, area, activity, audience filters | PL-2 |
| `plan/[id]` | Plan detail, join button, members count | PL-3, PL-4 |
| `plan/[id]/verify-gate` (sheet) | Prompt to verify before joining or chatting | ON-5 |
| `plan/create` | Create plan form | PL-1, SF-6 |
| `plan/create/venue` (sheet) | Pick from approved venues | PL-1, SF-1 |
| `(tabs)/my-plans` | Hosting, joined, requested, past | PL-5 |
| `plan/[id]/requests` | Host reviews join requests | PL-3 |
| `plan/[id]/check-in` | Check-in action and result | PL-6 |
| `plan/[id]/cancel` (sheet) | Host cancel; late-cancel warning | PL-5 |

### Mobile: chat

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `(tabs)/chats` | Chat list | CH-1 |
| `chat/[conversationId]` | Group chat; closed/read-only state after 24 h | CH-1, CH-2, CH-3 |
| `chat/[conversationId]/members` | Plan members, joined status | CH-1 |
| `report` (sheet) | Report sheet, reachable from every screen with a user or content | CH-4, SF-7 |

### Mobile: safety

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `safety/trusted-contact` | Set the trusted contact (stored on device only) | SF-2 |
| `safety/sos` (sheet) | SOS: send location once by WhatsApp, show 112 | SF-3 |
| `plan/[id]/rate` | Post-plan private rating | SF-4 |
| `settings/blocked` | Blocked users | CH-4 |

### Mobile: venues

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `venues` | Venue list for the city | VN-1 |
| `venue/[id]` | Venue detail: photos, hours, capacity, map | VN-1 |
| `venue/[id]/offer` | Offer redemption code (P1) | VN-2 |

### Mobile: account

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `(tabs)/account` | Account home | — |
| `settings` | Settings, language (Hindi / English) | NFR |
| `settings/subscription` | Plus / Premium (P1) | SB-2, SB-3 |
| `settings/privacy` | Consents, data export | ON-6, Privacy §5 |
| `settings/delete` | Delete account (3 taps from `settings`) | ON-6 |
| `settings/appeals` | My appeals and their status | VR-6 |
| `help` | Help, community rules, grievance officer contact | Privacy §5 |
| `suspended` | Shown when the account is suspended: reason and appeal link | VR-5, VR-6 |

### Admin web console (`apps/admin`)

| Route ID | Purpose | PRD |
| -------- | ------- | --- |
| `/login` | Admin sign-in | — |
| `/queue` | Review queue, filter by type and severity | AD-1, SF-7 |
| `/queue/[id]` | Item detail: AI verdict, score, evidence, approve / reject / escalate | AD-1 |
| `/users` | Search by name or user ID | AD-2 |
| `/users/[id]` | User record, reports given and received, action history, suspend / ban / restore | AD-2, AD-3 |
| `/plans/[id]` | Plan record and history | AD-2 |
| `/venues` | Venue list per city | AD-4, VN-1 |
| `/venues/[id]` | Create / edit / approve venue | VN-1, SF-1 |
| `/cities` | Set city status (waitlist, beta, live); waitlist counts | AD-4 |
| `/appeals` | Appeals queue | VR-6 |
| `/audit` | Read-only audit log | AD-3 |
| `/metrics` | Metrics dashboard (P1) | AD-5 |

## Open product questions that affect engineering

Tracked in the PRD. The docs are written so that none of these change the schema:

- Final name and domain: only display strings, bundle ID, and deep-link host change.
- Gender-based price: prices live in Play products, not code ([integrations.md](integrations.md)).
- Part-time moderator: the admin role model already supports more than two reviewers.
