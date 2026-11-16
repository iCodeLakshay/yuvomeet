# Hengout search, answer-engine and AI discovery plan

Applies to `apps/landing`. Written 2026-11-16 from a research pass; items marked **(verify)** come from secondary sources or knowledge and should be checked against the vendor page before you rely on them. Nothing here guarantees a ranking, an index date or an AI citation.

## What is implemented

- One canonical origin from `NEXT_PUBLIC_SITE_URL`, trailing-slash URLs everywhere, one canonical per page, `metadataBase`, Open Graph and Twitter cards with a generated 1200×630 share image, `lang="en-IN"`.
- `robots.txt` allows every crawler (search and AI) and names the sitemap. `sitemap.xml` lists every indexable page. The 404 page is `noindex`.
- JSON-LD: `Organization` and `WebSite` on `/`; `BreadcrumbList` on sub-pages.
- The 13 FAQ answers are visible HTML (`<details>`), each opening with the direct answer, so crawlers and answer engines read them without script.
- Fast by construction: static export, one self-hosted font, AVIF/WebP at several widths, no third-party scripts, GSAP loaded after interaction.

Deliberately **not** shipped, and why:

- `MobileApplication` / `SoftwareApplication`: Google requires a price plus real ratings or reviews, and the app has no store listing yet. Add it with the Play listing, using only real Play ratings.
- `FAQPage`: Google stopped showing FAQ rich results for sites like this (2023), and reportedly for all sites in 2026 **(verify)**. The questions stay as HTML.
- `llms.txt`: Google says it has no effect and no major vendor documents using it. Not worth the maintenance.
- Hacks for AI crawlers. The robots stance is "allow everything public". Whether to block training crawlers (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended) is the owner's business call; blocking them does not affect search inclusion.

## Before this can rank

1. **Final name and domain.** `Hengout` is a working name (PRD) and `hengout.app` is only the app's default. Renaming after profiles and links exist throws the work away. Check domain, trademark and handles first, then set `NEXT_PUBLIC_SITE_URL`.
2. **Real `/privacy/` and `/terms/` pages.** The app already links to them. They need legal review; this repo does not contain them.
3. Set `NEXT_PUBLIC_WAITLIST_URL` and the Supabase secrets (`WAITLIST_ALLOWED_ORIGINS`, `WAITLIST_PEPPER`) so the waitlist form works.
4. Verify the domain in Google Search Console and Bing Webmaster Tools; submit the sitemap.

## Keywords (India; no search volumes were available, so demand is a qualitative guess)

A new domain should not chase "meetup app" or "make friends app" (Meetup, Bumble BFF, Timeleft and listicles own them). Aim at Kota, safety and question queries, and own the brand name.

| Cluster | Example queries | Intent | Where |
| --- | --- | --- | --- |
| Kota local | group plans in Kota, safe meetups in Kota, make friends in Kota | local discovery | `/`, later `/kota/` |
| Safety | safe meetups for women, women-only meetups India, ID-verified social app | trust | safety section, later `/safety/` |
| Students and newcomers | how to make friends in Kota, Kota coaching students weekend, new in a city app | informational | later guides |
| Not dating | friendship app not dating, make friends without swiping | comparison | FAQ |
| Activities | cricket partners Kota, trekking group Kota, chai meetup Kota, board game café Kota | activity | plans section |
| Questions | is Hengout a dating app, is Hengout free, is there an iPhone app | answer engines | FAQ |
| Hinglish **(verify with native speakers)** | kota me dost kaise banaye, kota me weekend plan, ladkiyon ke liye safe meetup | informational | a few phrases in FAQ; Hindi pages later |

Handle student topics with care: no mental-health claims, nothing that reads as encouraging skipping study. Parents search "is Kota safe for girls"; the safety section should answer that in plain words.

## Competitors (verify in the live results; do not publish comparisons)

Meetup (organiser-led groups), Bumble BFF (swipe-based friendship), Timeleft (dinners with strangers), Misfits (hobby communities), Playo (sports bookings), BookMyShow and District (ticketed events), plus Kota guides and WhatsApp groups. Honest angles, all things the product already does: ID-verified adults, small groups, approved public venues, women-only plans, check-in and safety tools, Kota first. No "safest" or "guaranteed safe", no police or institute partnership claims.

## Pages: now and later

Now: `/` and `/community-guidelines/`. Later, when there is real content for each (thin pages hurt): `/how-it-works/`, `/safety/`, `/kota/` (a genuinely useful local guide), `/faq/`, `/privacy/`, `/terms/`. City pages only when a city is actually open (doorway pages for waitlist cities risk a spam classification). Guides (things to do in Kota, making friends as a coaching student) after launch, one a fortnight at most. `/download/` with `MobileApplication` markup once the Play listing exists.

Suggested titles (≤60 characters) and descriptions (≤155) for the later pages are in the research notes; write them to match the page when it ships.

## Entity and brand consistency (for AI and search)

Use one description everywhere, word for word: *"Hengout is an Android app where verified adults in Kota find and join small group plans at approved public venues."* Same name casing, logo and contact email on the site, the Play listing and every profile. Put `sameAs` links in `Organization` only for profiles that exist and are active. Pitch the roundups ("best apps to make friends") and Kota media after there is something to try.

## 30-day plan

**Day 0, record baselines:** Search Console and Bing verification; indexed pages; impressions and clicks (about zero); branded versus other queries; Lighthouse mobile and desktop scores (the field Core Web Vitals report will say "not enough data" at first). Ask ChatGPT search, Perplexity, Gemini or AI Mode, Copilot and Claude "What is Hengout?", "safe meetups in Kota" and "make friends in Kota", and write down who mentions or cites what (expected: nobody). Capture share previews on WhatsApp, X and LinkedIn. Add privacy-friendly analytics with a waitlist-signup event.

| Week | Do | KPI |
| --- | --- | --- |
| 1 | Deploy; submit sitemap to Google and Bing; create LinkedIn, Instagram and X profiles with the canonical sentence; IndexNow on deploy (Bing and others, not Google) | all pages indexed or discovered in 7–14 days; zero structured-data errors; Lighthouse mobile ≥ 90 |
| 2 | Add `/safety/`, `/faq/` or `/kota/` only if real content exists; link live profiles in `sameAs`; check share previews | indexed pages grow with real pages; first branded impressions |
| 3 | Pitch 3–5 Kota media or campus communities; submit to 2–3 startup directories; ask partner cafés to link | 3–5 real mentions or referring domains; signups by source |
| 4 | Review Search Console queries; rewrite titles with impressions but low click-through; repeat the AI check; plan two guides | "Hengout" ranks first for the brand; assistants describe the product correctly (fix the text if they don't) |

**Honest expectations for a new domain:** indexing takes days to weeks. Non-branded rankings usually take months and depend on links and content. In 30 days expect indexing, a first-place brand result if the name is unique, a handful of long-tail Kota impressions, and close to zero organic clicks and AI citations. AI assistants mostly cite pages that already rank or are mentioned on trusted pages, so earned mentions matter more than on-site tricks. Treat waitlist signups and branded search as the success metrics, and traffic as secondary. No purchased links, directory spam or invented reviews.
