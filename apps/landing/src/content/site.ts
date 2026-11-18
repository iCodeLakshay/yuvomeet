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
export const DESCRIPTION =
  'The verified community for people to connect over board games, rooftop chai, weekend hikes, and spontaneous offline plans tonight.';

/** Instagram handle: @next.gengroa. */
export const INSTAGRAM_URL = 'https://www.instagram.com/next.gengroa/';

/** Shown on the legal page; change it whenever the terms or the privacy policy change. */
export const LEGAL_UPDATED = '17 November 2026';

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
