/**
 * Every fact on the landing page lives here, and each one is backed by the app's own code or copy
 * (see the comments). Nothing here is a statistic, a review or a promise the app does not keep.
 * Hengout is a working name (PRD), so the name and domain are read from one place.
 */

/** Canonical origin. The app's env default (apps/mobile/src/lib/env.ts); set NEXT_PUBLIC_SITE_URL once the domain is final. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hengout.app').replace(/\/+$/, '');

/** The app's support address default (apps/mobile/src/lib/env.ts, EXPO_PUBLIC_SUPPORT_EMAIL). */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@hengout.app';

export const BRAND = 'Hengout';
/** Hengout is pre-launch with no store listing yet, so the one action is to write to the team. */
export const MAIN_ACTION = 'Email the team';

export const DESCRIPTION =
  'Hengout is an Android app for small group plans in Kota. Verified adults join groups of 3 to 10 at approved public venues: chai, study sessions, games, sport and treks.';

/** The eight activities, exactly as the database names them (supabase/migrations/20261026000010_baseline_data.sql). */
export const CATEGORIES = [
  'Chai & Cafe',
  'Study Session',
  'Board Games',
  'Walk & Talk',
  'Music & Jam',
  'Sports',
  'Book Club',
  'Treks & Hiking',
] as const;

/** Kota areas offered in the app's filters (packages/shared/src/constants.ts). */
export const KOTA_AREAS = [
  'Talwandi',
  'Vigyan Nagar',
  'Mahaveer Nagar',
  'Rajeev Gandhi Nagar',
  'Jawahar Nagar',
  'Kunhari',
  'Coral Park',
  'Riverfront',
] as const;

export const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#safety', label: 'Safety' },
  { href: '/#kota', label: 'Kota' },
  { href: '/#faq', label: 'Questions' },
] as const;

export interface Faq {
  q: string;
  a: string;
}

/**
 * Answers lead with the direct answer in the first sentence (answer engines quote it), then the
 * detail. Sources: verify/index.tsx, verify-gate.tsx, phone.tsx, rules.tsx, help.tsx, plan/new.tsx,
 * helpers.sql (women-only RLS), sos.tsx, contact.tsx, check-in.tsx, app.config.ts, flags.ts,
 * paywall_skip.sql, delete-account.tsx, privacy.tsx, city.tsx.
 */
export const FAQS: Faq[] = [
  {
    q: 'Is Hengout a dating app?',
    a: 'No. Hengout is for making friends through group plans of 3 to 10 people. There is no swiping or romantic matching, and every plan meets at an approved public venue.',
  },
  {
    q: 'Who can join Hengout?',
    a: 'Adults aged 18 and over who pass a one-time ID and selfie check. Anyone can browse plans first. Accounts that show the person is under 18 are blocked permanently.',
  },
  {
    q: 'How does verification work?',
    a: 'You confirm your age with DigiLocker or Aadhaar offline eKYC, then take a live selfie that is matched to your profile photo. It takes about a minute. If the automatic check is unsure, a person reviews it within 24 hours.',
  },
  {
    q: 'Does Hengout keep my Aadhaar number or ID photo?',
    a: 'No. Hengout keeps only your 18+ status, your birth year and the gender result of the check. Your Aadhaar number and ID photo are never stored.',
  },
  {
    q: 'Will other members see my phone number?',
    a: 'No. Your number is used only to sign in and is never shown to other members. Phone numbers, links and social handles are also blocked in group chats.',
  },
  {
    q: 'Where do plans happen?',
    a: 'Only at cafés and public spots that the Hengout team has approved, never in homes or private rooms. Plans end by 9 PM unless the venue is a checked late-evening partner.',
  },
  {
    q: 'How many people are in a plan?',
    a: 'Between 3 and 10, including the host. The host chooses the size and decides whether each request needs approval or whether members can join instantly.',
  },
  {
    q: 'Are there plans for women only?',
    a: 'Yes. Verified women can host plans that only verified women can see and join. The rule is enforced by the server, so these plans never appear in anyone else’s feed or by link.',
  },
  {
    q: 'What can I do if I feel unsafe at a plan?',
    a: 'Open the plan and tap Get help. You can call 112, or send one location fix to your trusted contact on WhatsApp. You can also report or block anyone from their profile, the plan or a message.',
  },
  {
    q: 'Does Hengout track my location?',
    a: 'No. Your location is used once, to check you in within 150 metres of the venue or to send an SOS, and is then discarded. The app does not ask for background location.',
  },
  {
    q: 'Does Hengout cost anything?',
    a: 'Joining and hosting plans is free while Hengout opens in Kota. Safety tools, including verification, reporting, blocking and Get help, are always free.',
  },
  {
    q: 'Which phones and cities does Hengout support?',
    a: 'Hengout is an Android app for Android 8 and later. Kota is the first city, and other cities follow.',
  },
  {
    q: 'Can I download my data or delete my account?',
    a: 'Yes, both from the app’s settings. Deleting your account hides your profile at once, cancels plans you host and removes the rest of your data within 30 days.',
  },
];

/** Community rules as the app shows them (apps/mobile/app/(account)/help.tsx and (onboarding)/rules.tsx). */
export const RULES = [
  { title: 'Verified adults only', body: 'Everyone passes an 18+ ID and selfie check before joining or hosting. Under-18 accounts are blocked permanently.' },
  { title: 'Public venues only', body: 'Plans happen at approved cafés and public spots, never homes or private places.' },
  { title: 'Groups of 3 to 10', body: 'Plans are for groups. Hosts set the size, from 3 to 10 people including themselves.' },
  { title: 'Respect, always', body: 'No harassment, pressure or unwanted contact. One severe report is enough for the team to act.' },
  { title: 'Keep details private', body: 'Don’t share phone numbers, socials or payment details before you’ve met. Group chats block phone numbers, links and handles.' },
  { title: 'Daylight by default', body: 'Plans end by 9 PM unless the venue is a checked late-evening partner.' },
  { title: 'Report anything off', body: 'Report or block from any profile, plan or message. Safety tools are always free.' },
] as const;
