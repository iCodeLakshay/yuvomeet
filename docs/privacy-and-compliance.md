# Privacy and compliance

> **Not legal advice.** This document turns the PRD's privacy section into product and engineering rules, oriented to India's Digital Personal Data Protection Act, 2023 (DPDP) and its rules, the IT (Intermediary Guidelines) Rules, and Google Play policy. Every item marked ⚖️ must be confirmed by a lawyer before public launch. A lawyer, not this doc, writes the privacy policy and terms.

## 1. Data we hold and why

| Data | Where | Purpose | Shown to others |
| ---- | ----- | ------- | --------------- |
| Phone number | `auth.users` only | Login (ON-1) | Never (S-5, S-6) |
| First name, photos, bio, interests, languages, area name | `profiles`, `profile_photos` | Profile and matching to plans | Yes, to users in the same city who are not blocked |
| Area cell (~1 km) | `profiles.area_cell` | Feed distance hints | No |
| Declared and verified gender | `profiles` | Women-only plans (PL-4), pricing (P1) | No (only the effect: access to women-only plans) |
| Birth year, "18+ verified" | `profiles` | Age gate (VR-1) | Age band only |
| KYC verdict, score, provider reference, ID fingerprint | `verification_checks`, `private.identity_fingerprints` | Proving 18+, one person one account, appeals | No |
| Plans, memberships, check-in time | `plans`, `plan_members` | Core product | To co-members |
| Messages and chat photos | `messages`, `media` bucket | Group chat | To conversation members |
| Reports, blocks, ratings | respective tables | Safety | Admins only (reporter sees own report status) |
| Moderation verdicts and decisions | `moderation_queue`, `audit_log` | Audits and appeals | Admins only |
| Consent records | `consents` | Proof of consent | No |
| Push token | `push_tokens` | Notifications | No |
| Analytics events | PostHog (EU) | Product improvement | No; pseudonymous ID only |

Never collected or stored: Aadhaar number, ID document images, selfies after the check, full date of birth, home address, contacts list, live location, precise GPS (check-in and SOS use one fix and discard it, S-36, S-51), trusted contact's number (device only, S-50), call audio.

The PRD lists "contacts" among consent purposes. P0 does not read the phone's contacts (the trusted contact is typed in), so no contacts permission is requested. If a later feature needs it, add a consent purpose then.

## 2. Consent

- **C-1** A purpose-specific consent screen (`(entry)/consent`) appears after OTP and before profile creation. It explains, one line each: camera (profile photos, selfie check), location (one-time check-in and SOS, never tracked), notifications (plan updates and chat). Each is a separate toggle; none is pre-ticked.
- **C-2** OS permission prompts are requested only at the moment of use (camera on photo upload, location on check-in or SOS), after the in-app consent for that purpose. Declining location still allows everything except check-in; SOS then sends the plan details without a location and still shows 112.
- **C-3** Community rules (ON-4) and terms/privacy acceptance are recorded in `consents` with `policy_version`. A new policy version re-prompts on next open.
- **C-4** Consent can be withdrawn in `settings/privacy`. Withdrawal writes a new `consents` row and takes effect immediately.
- **C-5** Consent screens and policies are available in Hindi and English. ⚖️ Confirm whether DPDP rules require additional languages or a specific notice format.
- **C-6** KYC consent is shown on `(verify)/intro` before the provider SDK opens: what is checked, what is stored (verdict, birth year, gender result), what is never stored. HyperVerge's own consent step (DigiLocker) follows.

## 3. Retention

| Data | Rule | Implemented by |
| ---- | ---- | -------------- |
| Plan chat | Read-only 24 h after the plan ends (CH-1). Held open longer only for a report (see moderation doc). Messages deleted 90 days after close, unless attached to an open report or appeal. ⚖️ | `plan_lifecycle_tick`, `retention_tick` |
| Messages of a deleted account | Removed within 30 days of the deletion request (ON-6). In group chats, the row is replaced with "Message removed" so threads stay readable. | `retention_tick` |
| Chat and profile images | Deleted with the message or photo row; quarantine objects deleted 7 days after decision | `retention_tick` |
| Account deletion | Profile, photos, memberships, consents, push tokens, exports purged within 30 days. Auth user deleted at the end, which deletes the phone number. | `delete-account`, `retention_tick` |
| Kept after deletion | `audit_log` rows, reports and moderation decisions about the user (pseudonymised to user ID), ban records and `id_fingerprint` for banned or minor accounts. Needed for safety and legal claims. ⚖️ Confirm period (proposal: 3 years, then purge). | — |
| KYC rows | Verdict rows kept while the account exists; deleted with the account, except fingerprints of banned or minor accounts | `retention_tick` |
| Call logs (P1) | 90 days; audio never recorded | `retention_tick` |
| Ratings | Deleted with the rater's account; aggregates in `profile_stats` remain | `retention_tick` |
| Data exports | File deleted 7 days after creation | `retention_tick` |
| Analytics | PostHog retention set to 12 months; user deleted from PostHog on account deletion via API | `delete-account` |
| Crash reports | Sentry retention 90 days | Sentry settings |
| Backups | Supabase backups age out on their schedule (7 days daily, PITR window). Deleted data may exist in backups until then. ⚖️ State this in the policy. | — |

## 4. User rights

| Right | Where | Rule |
| ----- | ----- | ---- |
| Access and export | `settings/privacy` → "Download my data" | `export-data` builds a JSON file (profile, photos as signed links valid 7 days, plans, own messages, reports filed, consents, verification verdicts) in the private `exports` bucket; delivered in-app as a file via the share sheet (ON-6). Ready within minutes; push when done. |
| Correction | `(profile)/edit` | All profile fields except verified fields; gender via support (VR-3, S-42); birth year via appeal. |
| Deletion | `settings` → `settings/delete` → confirm | 3 taps from settings (ON-6). Immediate effect: sessions revoked, profile hidden, pending joins withdrawn, hosted future plans cancelled with member notice. Purge within 30 days. |
| Withdraw consent | `settings/privacy` | C-4 |
| Grievance | `help` and policy page | Grievance officer name, email, and response timeline shown in the app and on the website. ⚖️ Confirm required response times under DPDP and IT Rules. |
| Appeal moderation decisions | `settings/appeals`, `suspended` | VR-6; see [moderation-and-safety.md](moderation-and-safety.md) |

## 5. Children

- Under-18 users are excluded entirely; verification is by ID, not self-declaration (VR-1). This avoids processing children's data, which under DPDP requires verifiable parental consent.
- Before verification, a user can browse but not join, host, or chat (ON-5). ⚖️ Confirm that holding a phone number and profile of an unverified user who later turns out to be a minor, for the short time before verification, is acceptable; the alternative is requiring verification before profile creation, at a cost to conversion.
- A minor verdict bans the account and purges data except the fingerprint and ban record (S-40).

## 6. Data residency and processors

- Personal data is stored and processed in India: Supabase `ap-south-1`, Rekognition `ap-south-1`, Vercel functions `bom1`, HyperVerge and MSG91 in India, LiveKit in India (P1).
- Non-India processors receive pseudonymous data only: PostHog (EU), Sentry (EU), Expo push relay, RevenueCat (P1), Google Maps tiles.
- A data processing agreement is signed with each processor before production data flows. ⚖️

## 7. Google Play requirements (check current policy before submission)

| Requirement | How we meet it |
| ----------- | -------------- |
| User-generated content policy: in-app reporting, blocking, moderation, published terms | Report and block reachable from every user, plan, and message surface (CH-4); moderation queue with human review (SF-7); community rules accepted before first join (ON-4); terms link in app and listing |
| Account deletion in-app and via web | `settings/delete` in app; a web page on the product domain explaining deletion and accepting a request by OTP login, required by Play for apps with accounts |
| Data safety form | Filled from §1 of this doc; must match exactly (data types, purposes, sharing with processors, encryption in transit, deletion available) |
| Play Billing for digital goods | Plus and Premium via Play Billing through RevenueCat (P1). Tickets and venue fees are in-person services and use Razorpay. |
| Sensitive permissions | Location requested only as foreground, single-use; no background location. Camera on use. No contacts, SMS, or call-log permissions (OTP autofill uses the SMS Retriever API, which needs no permission). |
| Dating category | We are a social / events app, not dating. Listing, screenshots, and copy avoid dating language (PRD non-goals). |
| Age rating | IARC questionnaire answered for user interaction and user-generated content; target audience 18+ declared. |

## 8. Intermediary obligations ⚖️

The PRD flags that the IT Rules likely apply to a platform with user content. Product hooks to support whatever counsel confirms:

- Published terms, privacy policy, community rules, and safety policy, in Hindi and English, linked from `help` and the store listing.
- Grievance officer appointed and contact published (§4).
- Complaint acknowledgement and resolution timelines tracked in `moderation_queue.due_at` and `appeals.due_at`.
- Takedown on lawful order: admin "remove content" action with reason, logged in `audit_log`.
- Preservation of records related to a removed account or content for the period counsel specifies (see §3 "kept after deletion").

## 9. Payments and tax (P1) ⚖️

- Razorpay for tickets and venue subscriptions; GST at 18% on our fees and invoices generated through Razorpay (VN-4). Confirm GST registration, place-of-supply, and TCS questions with a CA.
- Play Billing subscriptions: Google handles consumer tax collection per its policy; confirm with a CA how to account for it.

## 10. Lawyer checklist before public launch

Hand this list to counsel along with this doc and [security.md](security.md):

- [ ] Privacy policy and terms of use drafted (Hindi and English), covering every row in §1 and §3.
- [ ] Notice and consent format meets DPDP rules (C-1 to C-6).
- [ ] Retention periods confirmed: plan chats (90 days after close), records kept after deletion (proposed 3 years), call logs (90 days), backups.
- [ ] Storing `id_fingerprint` (HMAC of the KYC provider's document reference) to prevent duplicate and minor accounts: lawful basis and retention.
- [ ] Gender processing for women-only plans and gender-based pricing: lawful basis and notice; whether the pricing is permissible (also an open product question).
- [ ] Short pre-verification window for possibly-minor users (§5).
- [ ] Grievance officer appointment, published contact, response times.
- [ ] Intermediary status and due-diligence obligations (§8).
- [ ] DPAs with Supabase, HyperVerge, MSG91, AWS, PostHog, Sentry, Expo, Vercel, Google; RevenueCat, Razorpay, LiveKit at P1.
- [ ] Cross-border transfer of pseudonymous data to EU processors (PostHog, Sentry).
- [ ] Community rules and safety policy text.
- [ ] Law-enforcement request handling procedure.
- [ ] GST and invoicing (with a CA).
- [ ] Data breach response: who decides, who notifies the Data Protection Board and users, within what time.
