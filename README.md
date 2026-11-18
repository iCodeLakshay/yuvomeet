# Hengout

Hengout is an Android-first app that helps verified adults (18+) find **small group plans**, such as a chai evening, a study session, board games or a trek, and meet new people at **approved public venues** without sharing phone numbers. **Kota, Rajasthan** is the first city; other cities join through a waitlist.

It is not a dating app: no swiping, no 1:1 matching. Plans are for 3 to 10 people, every member passes a one-time ID and selfie check, and safety tools (venue check-in, SOS to a trusted contact, report and block) are always free.

> The product source of truth is the PRD: [PRD — Group Plans App (Kota first).md](<PRD — Group Plans App (Kota first).md>). Engineering decisions live in [docs/](docs/README.md).

---

## Repository layout

This is a **pnpm workspace** monorepo.

| Path | What it is | Stack |
| ---- | ---------- | ----- |
| [apps/mobile](apps/mobile) | The member app (Android) | Expo SDK 57, React Native 0.86, Expo Router, TanStack Query, MMKV |
| [apps/admin](apps/admin) | Admin and reviewer console (moderation queue, users, venues, payouts) | Next.js 16 (App Router), Supabase SSR, TOTP sign-in |
| [apps/landing](apps/landing) | Public website: waitlist landing page, terms and privacy, community guidelines | Next.js 16 static export, Tailwind CSS v4, GSAP |
| [packages/shared](packages/shared) | Types, constants and the generated database types shared by the apps (`@hengout/shared`) | TypeScript |
| [supabase](supabase) | Database migrations, RLS, pgTAP tests, seeds, Edge Functions | Postgres 17, Supabase (Mumbai, `ap-south-1`), Deno |
| [docs](docs/README.md) | Architecture, security, data model, integrations, privacy, environments | Markdown |
| [scripts](scripts) | Repo checks (for example `verify-security-rules.mjs`) | Node |

### How the pieces fit

```text
Android app (Expo) ─┐
Admin console ──────┼──> Supabase: Postgres + RLS, Auth, Realtime, Storage, Edge Functions
Landing site ───────┘        └─> HyperVerge (age check), MSG91 (SMS OTP), Razorpay (payments),
   (static)                       Resend (email), AWS Rekognition (photo moderation),
                                  PostHog (analytics, no PII), Sentry (errors, scrubbed)
```

- **The database enforces privacy and safety.** Rules live in RLS policies, triggers and `security definer` RPCs, not only in the app. `supabase/tests/security.test.sql` (pgTAP) checks them. See [docs/security.md](docs/security.md).
- **Personal data stays in India.** Supabase runs in Mumbai. Exceptions carry no PII; see [docs/integrations.md](docs/integrations.md).
- **Design comes from Google Stitch.** The project "Hengout Mobile App" in Stitch defines screens, colours and type; the landing page is ported from its "Waitlist Landing Page (Refined Hero)" screen.

---

## Prerequisites

| Tool | Version | Used for |
| ---- | ------- | -------- |
| Node.js | 22 LTS (CI uses 22) | Everything JavaScript |
| pnpm | 9.15.9 (pinned in `package.json`) | Installing and running workspaces |
| Docker Desktop | recent | Local Supabase |
| Supabase CLI | 2.x | Local database, migrations, type generation |
| Deno | 2.x | Edge Function checks and tests |
| Android Studio + SDK, JDK 17 | — | Building and running the Android app |
| Google Chrome | — | Landing page end-to-end tests (Playwright uses the installed Chrome) |

Enable pnpm once (or run it through `npx pnpm@9.15.9 …` if Corepack is not available):

```powershell
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

> **Windows note.** `.npmrc` keeps pnpm's virtual store outside the repo (`../.p`) and uses the hoisted linker. Both are needed for native Android builds (260-character path limit) and for Expo's config plugins. Do not remove them.

---

## First-time setup

```powershell
cd d:\Projects\yuvomeet
pnpm install

# Environment files (no secrets are committed; each .env.example documents its variables)
copy apps\mobile\.env.example        apps\mobile\.env
copy apps\admin\.env.example         apps\admin\.env.local
copy apps\landing\.env.example       apps\landing\.env.local
copy supabase\functions\.env.example supabase\functions\.env
```

### Local backend (Supabase)

```powershell
supabase start          # Postgres, Auth, Storage, Studio and Edge runtime in Docker
supabase db reset       # applies supabase/migrations, then the seeds listed in supabase/config.toml
supabase status         # prints the local URL and anon key for the .env files above
```

`supabase db reset` loads Kota, test venues and the **demo accounts** (all use the password `Hengout@123`; see [docs/demo-accounts.md](docs/demo-accounts.md)).

---

## Running the apps

All commands run from the repo root unless noted.

### Landing site (`apps/landing`)

```powershell
pnpm --filter @hengout/landing dev         # http://localhost:3001
pnpm --filter @hengout/landing build       # static export to apps/landing/out
pnpm --filter @hengout/landing start       # serves apps/landing/out on :3001
pnpm --filter @hengout/landing typecheck
pnpm --filter @hengout/landing test:e2e    # builds, serves and runs Playwright (desktop + Pixel 7)
```

Pages: `/` (waitlist landing), `/legal/` (terms of use and privacy policy), `/community-guidelines/`. The favicon, Apple icon and share card are drawn in code (`src/app/icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`), so the site ships no image files. Motion is GSAP (`src/components/Motion.tsx`) and switches off under "reduce motion".

Environment (`apps/landing/.env.local`, all public and baked into the build):

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | `https://hengout.app` | Canonical URLs, sitemap, structured data |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@hengout.app` | Contact and grievance links |

> The waitlist forms currently show the design's success state only; they do not post to the `join-waitlist` Edge Function yet.

### Admin console (`apps/admin`)

```powershell
pnpm admin:dev                             # same as: pnpm --filter @hengout/admin dev  → http://localhost:3000
pnpm --filter @hengout/admin build
pnpm --filter @hengout/admin test
```

Sign-in is email + password, then a TOTP code. Grant the first admin from SQL; see [apps/admin/README.md](apps/admin/README.md).

### Mobile app (`apps/mobile`)

The app uses native modules (MMKV, maps, secure store), so it needs a **development build**, not Expo Go. Run Expo from `apps\mobile` (or through the root scripts), never with bare `npx expo` from the repo root.

```powershell
pnpm mobile:android        # build and install the dev client on a device or emulator
pnpm mobile:start          # Metro only, once the dev client is installed

cd apps\mobile
pnpm exec expo run:android --device        # pick a USB-connected phone
adb reverse tcp:8081 tcp:8081              # if the phone cannot reach Metro on localhost
```

Release APKs (local Gradle and EAS), USB debugging and troubleshooting are in [apps/mobile/README.md](apps/mobile/README.md).

### Edge Functions (`supabase/functions`)

```powershell
supabase functions serve --env-file supabase/functions/.env   # run all functions locally
pnpm functions:check                                          # deno check + deno test _shared/
```

---

## Quality checks

| Command | What it runs |
| ------- | ------------ |
| `pnpm typecheck` | TypeScript in every workspace (mobile, admin, landing, shared) |
| `pnpm lint` | ESLint for the mobile app (`--max-warnings 0`) |
| `pnpm test` | Jest (mobile), Node tests (admin), then `scripts/verify-security-rules.mjs` |
| `pnpm db:test` | pgTAP security and behaviour tests against the local database |
| `pnpm db:types` | Regenerates `packages/shared/src/database.types.ts` from the local schema |
| `pnpm functions:check` | Deno type-check and tests for Edge Functions |
| `pnpm check:security` | Static checks for security rules in the codebase |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs typecheck, lint, tests, the admin build, the landing e2e tests and build, an Android JS bundle, Edge Function checks, pgTAP plus type-drift checks, and a Gitleaks secret scan.

---

## Environments

| | Local | Staging | Production |
| - | ----- | ------- | ---------- |
| Supabase | `supabase start` (Docker) | project `yuvomeet-staging`, `ap-south-1` | project `yuvomeet-prod`, `ap-south-1` |
| Data | seeds (synthetic Kota data, demo accounts) | seeded synthetic data and consenting testers | real users |

The Supabase project refs, the Android package id (`app.yuvomeet`), the deep-link scheme (`yuvomeet://`) and on-device storage keys keep their original names on purpose: renaming them would break existing installs, sign-in redirects and linked cloud projects. Everything users see says **Hengout**. Full details: [docs/environments.md](docs/environments.md).

Deploying migrations: `supabase link --project-ref <ref>` then `supabase db push`. The admin console deploys to Vercel (`bom1`). The landing site is a static folder (`apps/landing/out`) that any static host can serve.

---

## Further reading

| Doc | Read it to learn |
| --- | ---------------- |
| [docs/architecture.md](docs/architecture.md) | System shape, request paths, plan lifecycle |
| [docs/security.md](docs/security.md) | RLS, phone secrecy, women-only plans, audit, check-in |
| [docs/data-model.md](docs/data-model.md) | Tables, enums, RLS matrix |
| [docs/integrations.md](docs/integrations.md) | What each vendor does and never receives |
| [docs/privacy-and-compliance.md](docs/privacy-and-compliance.md) | DPDP rules, retention, consent |
| [docs/moderation-and-safety.md](docs/moderation-and-safety.md) | Review queue, SLAs, appeals |
| [docs/implementation-plan.md](docs/implementation-plan.md) | P0 build order and PRD IDs |
