# PRD — Group Plans App (Kota first)

Oct 24, 2026 · @Lakshay

## 1. Overview

This app lets verified adults (18+) in a city find group plans, such as a cafe evening, a walk, a trek or a study session, and meet people safely without sharing phone numbers. Kota is the first city; every other city launches later through a waitlist. Working name: **Yuvomeet** (placeholder, see the market doc for alternatives).

**Problem.** People who move to a city for study or work have no safe, trusted way to find company. Instagram and WhatsApp groups have no verification, and dating apps carry the wrong intent and the wrong reputation for friendship.

**Goals (first 6 months)**

1. Prove that strangers will attend a verified group plan and come back for a second one.
2. Keep the platform safe enough that women are at least 35% of active users.
3. Earn revenue from day one through cafe partnerships and Plus/Premium subscriptions.

**Non-goals**

- Dating, swiping or romantic matching.
- Anyone under 18, ever.
- Video calls, live location sharing, a web app.
- A second live city before Kota passes its gates.

**Success metrics**

| Metric                                    | Target at month 6 | Definition                                                         |
| ----------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| Plans that happened (north star)          | 150 a week        | Plan marked completed with 2+ attendees checked in                 |
| Women share of weekly active users        | 35%+              | Verified women / all verified weekly actives                       |
| 30-day repeat joiners                     | 40%+              | Users who joined 2+ plans within 30 days of their first            |
| Safety reports per 1,000 plan attendances | under 5           | All reviewed within 12 hours                                       |
| Verification pass rate                    | 70%+              | Users who pass the 18+ and selfie check on the first or second try |
| Paying partner venues                     | 15                | Venues with an active monthly plan                                 |

**Scope by phase**

| Phase          | Contents                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| P0 (MVP)       | Onboarding, verification, plans, group chat, safety layer, partner venues, free tier, admin console |
| P1 (month 4–6) | Plus and Premium subscriptions, ticketed events, masked voice calls, curated tables                 |
| P2 (month 7+)  | People nearby, second city, venue dashboard, sponsored plans                                        |

## 2. Users and core loop

The launch audience is verified adults 18–30 who are new to Kota or have a small social circle, with women as the segment that decides whether the app works.

| Persona                | Age | Situation                                    | Job to be done                                     | Concern to design for                 |
| ---------------------- | --- | -------------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| Riya, NEET repeater    | 19  | Second year in Kota, hostel, strict schedule | A study buddy and an evening walk with other girls | Safety; parents finding out           |
| Aman, RTU student      | 20  | Local college, has a bike, bored on weekends | Cricket, treks, cafe hopping                       | Plans being full or cancelled         |
| Neha, coaching faculty | 26  | Moved from Jaipur, knows only colleagues     | Dinners and events with women her age              | Being matched with creepy men         |
| Cafe owner, Talwandi   | n/a | Empty 3–6 pm                                 | Fill off-peak tables with paying groups            | Rowdy crowds; unclear return on spend |
| City admin (you)       | n/a | Two-person team                              | Approve venues, clear review queue, handle reports | Overload at night and weekends        |

[embedded content: Core loop · 4 steps, repeating

Hosts create plans and members join; both sides rate the plan afterwards. A plan only counts as a success when it happens and people feel safe, which is why rating and check-in sit inside the loop.

## 3. Feature requirements

P0 ships in the MVP, P1 in months 4–6, P2 later. Every requirement has an ID so you can reference it in tickets.

### 3.1 Onboarding and accounts

| ID   | Requirement                                                                      | Priority | Acceptance criteria                                                                                       |
| ---- | -------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| ON-1 | Phone OTP sign-up and login                                                      | P0       | OTP arrives in under 30 seconds; 5 wrong tries lock the number for 30 minutes                             |
| ON-2 | City selection at sign-up                                                        | P0       | User picks from a city list; non-live cities see a waitlist screen and are saved to the `cities` waitlist |
| ON-3 | Profile: first name, 2–6 photos, bio (max 300 chars), interests, languages, area | P0       | Profile cannot be saved with fewer than 2 photos; photos are checked by AI before they appear             |
| ON-4 | Community rules accepted at sign-up                                              | P0       | User must tick and see a one-screen summary before the first plan join                                    |
| ON-5 | Browse plans before verification                                                 | P0       | Feed is readable without verification; join and chat actions prompt verification                          |
| ON-6 | Account deletion and data export                                                 | P0       | Delete in 3 taps; data removed within 30 days; export delivered in-app as a file                          |

### 3.2 Verification and AI screening

| ID   | Requirement                                                          | Priority | Acceptance criteria                                                                                |
| ---- | -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| VR-1 | 18+ check through DigiLocker or Aadhaar offline e-KYC via a provider | P0       | Under-18 results block the account permanently; only "18+ verified" and birth year are stored      |
| VR-2 | Selfie liveness and face match against profile photos                | P0       | Match score above the agreed threshold passes; borderline goes to manual review; one retry allowed |
| VR-3 | Gender confirmation from the selfie and ID                           | P0       | Mismatch with declared gender goes to manual review; gender change only via support                |
| VR-4 | AI profile and text screening                                        | P0       | Phone numbers, social handles, abusive or sexual words are blocked or held before they appear      |
| VR-5 | Reputation-based auto-suspension                                     | P0       | 2 reports from different users in 30 days suspends the user pending review; user is told why       |
| VR-6 | Appeal flow                                                          | P0       | User can appeal any rejection or suspension in-app; a human answers within 48 hours                |
| VR-7 | Verified badge                                                       | P0       | Shown only after VR-1, VR-2 and VR-3 pass                                                          |

### 3.3 Plans (core)

| ID   | Requirement                                                                                                                                                          | Priority | Acceptance criteria                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| PL-1 | Create a plan: title, activity, venue from the approved list, date and time, group size 3–10, audience (everyone / women only / same college), optional ticket price | P0       | Free users can host up to 1 plan a week; plans must start at least 3 hours ahead and end by 9 pm unless at a partner venue |
| PL-2 | Plans feed filtered by day, area, activity, audience                                                                                                                 | P0       | Loads in under 2 seconds on 4G; shows only plans in the user's city                                                        |
| PL-3 | Request to join; host approves or declines                                                                                                                           | P0       | Host sees verified badge, interests, ratings and past attendance; decline does not reveal the reason                       |
| PL-4 | Women-only plans visible and joinable only by verified women                                                                                                         | P0       | Men never see them in the feed or by link                                                                                  |
| PL-5 | Plan lifecycle: open, full, started, completed, cancelled                                                                                                            | P0       | Host cancelling within 3 hours is recorded; repeated cancellations reduce visibility                                       |
| PL-6 | Check-in at the venue                                                                                                                                                | P0       | A member can check in only within 150 m of the venue and 30 minutes of the start time                                      |
| PL-7 | Curated tables: the app groups 4–6 strangers by interest for a fixed slot                                                                                            | P1       | Participants are notified 24 hours ahead; unmatched users get a refund                                                     |
| PL-8 | Ticketed plans with in-app payment                                                                                                                                   | P1       | Razorpay checkout; refund if the host cancels; commission recorded                                                         |
| PL-9 | Recurring plans (weekly walk, weekly game night)                                                                                                                     | P2       | Host sets a cadence; each occurrence is its own plan                                                                       |

### 3.4 Chat

| ID   | Requirement                                                                | Priority | Acceptance criteria                                                                                   |
| ---- | -------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| CH-1 | Group chat per plan, opened on approval and closed 24 hours after the plan | P0       | Messages appear in under 1 second; members see who has joined                                         |
| CH-2 | Text, emoji and photos (blurred until tapped)                              | P0       | Photos pass AI check before delivery                                                                  |
| CH-3 | Number and link masking                                                    | P0       | Phone numbers and external handles are blocked in plan chats and for the first 3 days of any 1:1 chat |
| CH-4 | Report, block and leave from every screen                                  | P0       | A blocked user disappears from the blocker's feed, chats and plans                                    |
| CH-5 | 1:1 chat between members of a completed plan                               | P1       | Both users must opt in after the plan; either can close it                                            |
| CH-6 | Voice notes                                                                | P1       | Max 60 seconds; scanned for abuse after upload                                                        |

### 3.5 Masked voice calls

| ID   | Requirement                                                     | Priority | Acceptance criteria                                                                           |
| ---- | --------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| VC-1 | In-app voice call between two users with no phone numbers shown | P1       | Caller sees first name and photo only; the call works over WebRTC on mobile data              |
| VC-2 | Call unlock rule                                                | P1       | Both users accept, have exchanged 10 messages, and share a completed plan or an accepted chat |
| VC-3 | Call controls                                                   | P1       | Either user can end, mute, report or block during the call; per-chat "disable calls" setting  |
| VC-4 | Call logs without audio                                         | P1       | Time, duration and participants only; audio is never recorded                                 |
| VC-5 | Voice room for group plans before the event                     | P2       | Optional; host starts it; any member can leave                                                |

### 3.6 Contact sharing

| ID   | Requirement                        | Priority | Acceptance criteria                                                                                                 |
| ---- | ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| CS-1 | Share my number as a one-time card | P1       | Sender confirms twice; receiver sees a notice; the sender can turn off future shares but cannot unsee what was sent |
| CS-2 | Warning before sharing             | P1       | Shows "Only share with people you trust" and logs the event                                                         |

### 3.7 Safety features

| ID   | Requirement                                            | Priority | Acceptance criteria                                                              |
| ---- | ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------- |
| SF-1 | Public venues only; approved venue list                | P0       | Admin approves every venue; home addresses and private venues are rejected       |
| SF-2 | Trusted contact: share plan details by a WhatsApp link | P0       | One tap; includes venue, time and host name; no live tracking                    |
| SF-3 | SOS button during a plan                               | P0       | Sends the user's location once to the trusted contact and shows the 112 helpline |
| SF-4 | Post-plan private rating (felt safe? showed up?)       | P0       | Prompt 1 hour after the plan; two "unsafe" ratings trigger manual review         |
| SF-5 | Rate limits for new accounts                           | P0       | New accounts: max 5 join requests and 20 messages a day for the first week       |
| SF-6 | No new 1:1 meetups after 9 pm                          | P0       | Enforced at plan creation; partner venues can opt out for events                 |
| SF-7 | Moderation queue with human review                     | P0       | Severe reports reviewed within 12 hours; every action logged with reviewer name  |

### 3.8 Subscriptions

| ID   | Requirement                                   | Priority | Acceptance criteria                                                                   |
| ---- | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| SB-1 | Free tier                                     | P0       | Browse plans, join 2 plans a week, group chat, every safety feature                   |
| SB-2 | Plus: ₹99 a month (women), ₹199 a month (men) | P1       | Unlimited joins, host plans, call unlock; price set by verified gender                |
| SB-3 | Premium: ₹499 a month                         | P1       | Everything in Plus, curated tables, priority approval, venue discounts, profile boost |
| SB-4 | Billing through Google Play Billing           | P1       | Restore purchases works; cancellations take effect at period end                      |
| SB-5 | Safety is never paywalled                     | P0       | Block, report, SOS, check-in and masking are free for everyone                        |

### 3.9 Venues

| ID   | Requirement                                                 | Priority | Acceptance criteria                                     |
| ---- | ----------------------------------------------------------- | -------- | ------------------------------------------------------- |
| VN-1 | Venue profile: name, area, photos, hours, capacity, map pin | P0       | Created and approved by admin before it appears         |
| VN-2 | Partner badge and offer for app users                       | P1       | Offer redeemed through a code shown after check-in      |
| VN-3 | Venue dashboard: check-ins and redemptions                  | P2       | Weekly footfall figures per venue                       |
| VN-4 | Venue subscription billing                                  | P1       | Monthly invoice through Razorpay; GST invoice generated |

### 3.10 Admin console

| ID   | Requirement                                     | Priority | Acceptance criteria                                                             |
| ---- | ----------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| AD-1 | Verification and moderation review queue        | P0       | Shows AI verdict, score and evidence; approve, reject or escalate in one click  |
| AD-2 | User, plan and venue lookup with action history | P0       | Search by name or user ID; shows reports received and given                     |
| AD-3 | Suspend, ban, restore with a reason             | P0       | Every action stored with timestamp and admin ID                                 |
| AD-4 | City management                                 | P0       | Set a city to waitlist, beta or live; manage its venue list                     |
| AD-5 | Metrics dashboard                               | P1       | North-star, women share, repeat rate and safety report rate, filterable by city |

## 4. User flows and screens

The main flow keeps friction low by asking for verification only when the user first joins a plan.

[embedded content: Main user flow · 8 steps

**Screen list (MVP)**

| Area              | Screens                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| Entry             | Splash, city picker or waitlist, phone OTP, community rules                 |
| Profile           | Create profile, photo upload, interests, edit profile, other user's profile |
| Verification      | Explain why, ID check, selfie, result, appeal                               |
| Plans             | Feed, filters, plan detail, create plan, my plans, join requests, check-in  |
| Chat              | Chat list, group chat, plan members, report sheet                           |
| Safety            | Trusted contact setup, SOS, post-plan rating, blocked users                 |
| Venues            | Venue list, venue detail, offer redemption (P1)                             |
| Account           | Settings, subscription (P1), privacy, delete account, help                  |
| Admin web console | Review queue, user lookup, venues, cities, metrics                          |

**Edge cases to build for**

- User fails the selfie twice: show a clear manual-review message and an expected reply time, never a bare "rejected".
- Host cancels at the last minute: notify all members, record it against the host.
- Plan has no-shows: attendees rate it; a pattern of no-shows reduces the user's join priority.
- A member reports during a plan: the chat stays open for 24 hours for evidence; the reported user is muted for that group.

## 5. Privacy, safety and legal requirements

The app handles ID data and location for adults who meet strangers, so privacy and safety rules are product requirements, not afterthoughts. Have a lawyer review this section before launch; I am not giving legal advice.

| Area               | Requirement                                                                                                                                     | Confidence                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Age                | Under-18 users are blocked permanently; verification is by ID, not self-declaration                                                             | Certain DPDP treats under-18s as children and needs verifiable parental consent, so excluding them avoids it |
| Consent            | A purpose-specific consent screen for location, camera, contacts and notifications                                                              | Likely Required by DPDP-style consent rules                                                                  |
| Data stored        | Phone number, name, photos, interests, coarse area; "18+ verified" flag and birth year; never the Aadhaar number                                | Likely Collect the minimum                                                                                   |
| Location           | Area cell (about 1 km) stored; precise GPS used only on-device for check-in and SOS                                                             | Likely Avoids tracking claims                                                                                |
| Phone numbers      | Never exposed by any API; shared only through an explicit contact card                                                                          | Certain Product decision                                                                                     |
| Retention          | Messages deleted 30 days after account deletion; plan chats auto-archive 24 hours after the plan; call logs 90 days; audio never stored         | Guessing Confirm with a lawyer                                                                               |
| Data residency     | Supabase region in India (Mumbai)                                                                                                               | Likely Safer under DPDP                                                                                      |
| User rights        | In-app access, correction, export, deletion and grievance officer contact                                                                       | Certain Required by DPDP for data principals                                                                 |
| Moderation records | Store AI verdicts, scores and human decisions for audits                                                                                        | Likely Needed for appeals and disputes                                                                       |
| App store          | Google Play requires Play Billing for digital subscriptions, account deletion in-app, and a user-generated-content policy with report and block | Likely Check current policy before submission                                                                |
| Payments           | Razorpay for tickets and venue fees; GST invoices at 18%                                                                                        | Likely Confirm GST registration needs with a CA                                                              |
| Intermediary rules | Appoint a grievance officer and publish terms and a safety policy                                                                               | Guessing IT Rules likely apply to a platform with user content                                               |

**Safety principles**

1. Group first: no 1:1 contact until two people have shared a completed plan.
2. Public places only: approved venues, daylight and evening hours.
3. Safety is free: no safety feature sits behind a paywall.
4. Every report is read by a human within 12 hours for severe cases.
5. Say no to quietly: declined join requests never show a reason.

## 6. Data model and non-functional requirements

The stack is React Native (Expo) on the client and Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) on the backend, with LiveKit for voice calls; the architecture diagram is in the market research doc. Every table has Row Level Security, so privacy is enforced in the database and not only in app code.

| Table                          | Key fields                                                                                | Notes                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `cities`                       | id, name, status (waitlist / beta / live), launchdate                                     | Drives multi-city launch                                                    |
| `profiles`                     | id, cityid, firstname, birthyear, gender, bio, interests, areacell, verifiedat, status    | Never stores the phone number in a readable table; the number stays in Auth |
| `verification_checks`          | id, userid, type, providerref, aiscore, verdict, reviewerid, decidedat                    | Audit trail for AI and human decisions                                      |
| `venues`                       | id, cityid, name, areacell, lat, lng, partner, status                                     | Admin approved only                                                         |
| `plans`                        | id, cityid, hostid, venueid, title, activity, startsat, capacity, audience, price, status | Audience restricts who can see it                                           |
| `plan_members`                 | planid, userid, status, checkedinat                                                       | Status: requested, approved, declined, attended, no-show                    |
| `conversations` and `messages` | id, planid or pair, senderid, body, flagged, createdat                                    | Closes 24 h after plans                                                     |
| `calls`                        | id, conversationid, startedat, duration                                                   | No audio stored                                                             |
| `reports` and `blocks`         | reporterid, targetid, reason, status                                                      | Blocks enforced in RLS                                                      |
| `ratings`                      | planid, raterid, feltsafe, showedup                                                       | Private; visible only to admins and aggregates                              |
| `subscriptions`                | userid, tier, storeref, renewsat                                                          | Verified by webhook                                                         |
| `moderation_queue`             | id, subjecttype, subjectid, aiverdict, status                                             | Human review queue                                                          |

**Non-functional requirements**

| Area          | Requirement                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance   | Feed loads in under 2 seconds on 4G; chat messages delivered in under 1 second; app cold start under 3 seconds on a mid-range Android phone |
| Platforms     | Android first (Android 8+); iOS after the Kota beta                                                                                         |
| Scale target  | 10,000 monthly active users and 500 concurrent chats per city without architecture changes                                                  |
| Reliability   | 99.5% uptime; offline view of already loaded plans; chat queues messages when offline                                                       |
| Security      | RLS on every table; secrets only in Edge Functions; images served through signed URLs; rate limits on auth and messaging                    |
| Accessibility | Hindi and English at launch; text scalable to 130%; tap targets at least 44 px                                                              |
| Observability | Crash reporting (Sentry), product analytics (PostHog), an alert when the review queue exceeds 24 hours                                      |
| Cost guard    | Budget alert at ₹50,000 a month; AI and KYC calls cached and not repeated for the same user                                                 |

## 7. Release plan, analytics, risks and open questions

Ship the smallest version that can prove one thing: strangers show up to a verified group plan and come back. Everything in P1 and P2 waits for that proof.

### Release plan

| Stage                 | Weeks     | Scope                                                                   | Exit gate                                                                 |
| --------------------- | --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 0. Offline pilot      | 0–4       | 10 manual group plans through WhatsApp in 3–4 Kota cafes; 50 interviews | 40%+ attend a second plan; 30%+ attendees are women; 5 cafes ready to pay |
| 1. MVP build          | 4–16      | All P0 requirements in section 3                                        | Internal test with 30 friends; verification pass rate above 70%           |
| 2. Closed beta        | 16–20     | 300 invited users from 2–3 colleges and young-professional groups       | No serious safety incident; 30-day retention 25%+                         |
| 3. Kota public launch | Month 5–6 | P1: subscriptions, tickets, voice calls, curated tables                 | 150 plans a week; 15 paying venues                                        |
| 4. Second city        | Month 9+  | City data, venue list, ambassadors                                      | Kota profitable at venue level                                            |

### Analytics events (minimum)

- Signup: `otp_requested`, `otp_verified`, `profile_completed`, `city_selected`.
- Verification: `verification_started`, `verification_passed`, `verification_failed`, `appeal_submitted`.
- Plans: `plan_viewed`, `join_requested`, `join_approved`, `plan_created`, `check_in`, `plan_completed`, `plan_cancelled`.
- Trust: `report_submitted`, `user_blocked`, `sos_pressed`, `rating_submitted`.
- Revenue: `paywall_viewed`, `subscription_started`, `ticket_purchased`, `venue_offer_redeemed`.

### Risks

| Risk                                                  | Likelihood | Impact | Mitigation                                                                                      |
| ----------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------- |
| Women do not join or leave early                      | High       | Fatal  | Women-only plans, women ambassadors, strict AI and report rules, cheaper pricing                |
| Serious safety incident at a meetup                   | Medium     | Fatal  | Public venues only, group-first, SOS, trusted contact, 9 pm cut-off, quick suspension           |
| Empty feed (not enough plans)                         | High       | High   | Seed plans yourself with friends, partner cafes host weekly events, curated tables              |
| Parents or institutes oppose the app                  | Medium     | High   | Friendship positioning, 18+ only, local advisory support, no dating language                    |
| AI wrongly rejects genuine users                      | Medium     | Medium | Manual appeal within 48 hours; tune thresholds on beta data                                     |
| Men register as women to pay less                     | Medium     | Medium | Gender check from selfie and ID; one change via support                                         |
| Two-person team cannot handle moderation              | High       | High   | Auto-suspend on severe reports; twice-daily queue; hire a part-time moderator once at 2,000 MAU |
| Verification costs eat margin                         | Medium     | Medium | Verify only at first plan join; cache results                                                   |
| Play Store rejects the app for user-generated content | Low        | High   | Publish report, block, deletion and moderation policy before submission                         |

### Open questions

- [ ] Final app name and domain (shortlist is in the market research doc).
- [ ] Which KYC provider to use: compare price per check and DigiLocker support.
- [ ] Will you speak to the Kota administration or police about a student-safety partnership?
- [ ] Runway: how many months can you fund without revenue?
- [ ] Will you hire a part-time moderator, and from when?
- [ ] Is the gender-based price (₹99 / ₹199) acceptable, or should every user pay the same?
- [ ] Legal review of terms, privacy policy and grievance officer setup.
