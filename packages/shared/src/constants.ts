/**
 * Authoritative P0 constants mirrored in `private.settings` in SQL.
 * See docs/architecture.md, docs/data-model.md, and docs/security.md.
 */

export const FREE_JOINS_PER_WEEK = 2; // S-25, SB-1
export const FREE_HOSTS_PER_WEEK = 1; // S-26, PL-1
export const NEW_ACCOUNT_DAYS = 7; // S-27, SF-5
export const NEW_JOIN_PER_DAY = 5; // S-27, SF-5
export const NEW_MSG_PER_DAY = 20; // S-27, SF-5
export const MAX_MESSAGES_PER_MIN = 30; // S-28
export const MAX_REPORTS_PER_DAY = 10; // S-28
export const MAX_JOINS_PER_DAY = 20; // S-28
export const PLAN_MIN_LEAD_HOURS = 3; // S-31, PL-1
export const PLAN_CUTOFF_LOCAL_HOUR = 21; // S-32, SF-6 (21:00 Asia/Kolkata)
export const PLAN_CUTOFF_LOCAL = '21:00';
export const MAX_PLAN_DURATION_HOURS = 6; // S-32
export const MIN_PLAN_CAPACITY = 3; // S-31, PL-1
export const MAX_PLAN_CAPACITY = 10; // S-31, PL-1
export const CHECKIN_RADIUS_M = 150; // S-36, PL-6
export const CHECKIN_WINDOW_MIN = 30; // S-36, PL-6
export const CHECKIN_MAX_ACCURACY_M = 100; // S-36
export const CHAT_CLOSE_HOURS = 24; // CH-1
export const OTP_LOCK_MAX_FAILS = 5; // S-10, ON-1
export const OTP_LOCK_MINUTES = 30; // S-10, ON-1
export const OTP_RESEND_COOLDOWN_SEC = 60; // S-11
export const OTP_MAX_SENDS_PER_HOUR = 5; // S-11
export const MIN_PROFILE_PHOTOS = 2; // ON-3
export const MAX_PROFILE_PHOTOS = 6; // ON-3
export const MAX_BIO_CHARS = 300; // ON-3
export const MAX_MESSAGE_CHARS = 1000; // CH-1
export const MAX_JOIN_NOTE_CHARS = 140; // PL-3
export const MAX_REPORT_DETAILS_CHARS = 1000;
export const MAX_APPEAL_CHARS = 1000; // VR-6
export const AUTO_SUSPEND_REPORTS_30D = 2; // VR-5
export const UNSAFE_RATINGS_ESCALATE_30D = 2; // SF-4
export const LATE_CANCEL_WINDOW_HOURS = 3; // PL-5
export const FEED_PAGE_SIZE = 20; // Architecture §Feed
export const EMERGENCY_HELPLINE = '112'; // SF-3
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const AGE_BANDS = ['18–20', '21–24', '25–30', '30+'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export function computeAgeBand(birthYear: number | null | undefined, currentYear = new Date().getFullYear()): AgeBand {
  if (!birthYear) return '18–20';
  const age = currentYear - birthYear;
  if (age <= 20) return '18–20';
  if (age <= 24) return '21–24';
  if (age <= 30) return '25–30';
  return '30+';
}

export interface KotaAreaOption {
  slug: string;
  nameEn: string;
  nameHi: string;
  areaCell: string; // H3 res-8 cell (~1 km coarse cell, S-18)
}

export const KOTA_AREAS: readonly KotaAreaOption[] = [
  { slug: 'talwandi', nameEn: 'Talwandi', nameHi: 'तलवंडी', areaCell: '883d8b4491fffff' },
  { slug: 'vigyan-nagar', nameEn: 'Vigyan Nagar', nameHi: 'विज्ञान नगर', areaCell: '883d8b4493fffff' },
  { slug: 'mahaveer-nagar', nameEn: 'Mahaveer Nagar', nameHi: 'महावीर नगर', areaCell: '883d8b4495fffff' },
  { slug: 'rajeev-gandhi-nagar', nameEn: 'Rajeev Gandhi Nagar', nameHi: 'राजीव गांधी नगर', areaCell: '883d8b4497fffff' },
  { slug: 'jawahar-nagar', nameEn: 'Jawahar Nagar', nameHi: 'जवाहर नगर', areaCell: '883d8b4499fffff' },
  { slug: 'kunhari', nameEn: 'Kunhari (Landmark City)', nameHi: 'कुन्हाड़ी (लैंडमार्क सिटी)', areaCell: '883d8b449bfffff' },
  { slug: 'coral-park', nameEn: 'Coral Park', nameHi: 'कोरल पार्क', areaCell: '883d8b449dfffff' },
  { slug: 'gumanpura', nameEn: 'Gumanpura & Riverfront', nameHi: 'गुमानपुरा और रिवरफ्रंट', areaCell: '883d8b449ffffff' },
] as const;

export interface LookupItem {
  slug: string;
  labelEn: string;
  labelHi: string;
  icon: string;
  sort: number;
}

export const ACTIVITIES: readonly LookupItem[] = [
  { slug: 'chai-cafe', labelEn: 'Chai & Cafe', labelHi: 'चाय और कैफ़े', icon: 'coffee', sort: 1 },
  { slug: 'study-session', labelEn: 'Study Session', labelHi: 'पढ़ाई सेशन', icon: 'book-open', sort: 2 },
  { slug: 'board-games', labelEn: 'Board Games', labelHi: 'बोर्ड गेम्स', icon: 'dice-5', sort: 3 },
  { slug: 'walk-talk', labelEn: 'Walk & Talk', labelHi: 'सैर और बातचीत', icon: 'footprints', sort: 4 },
  { slug: 'music-jam', labelEn: 'Music & Jam', labelHi: 'म्यूज़िक जैम', icon: 'music', sort: 5 },
  { slug: 'sports-cricket', labelEn: 'Sports & Cricket', labelHi: 'खेल और क्रिकेट', icon: 'trophy', sort: 6 },
  { slug: 'book-club', labelEn: 'Book & Reading', labelHi: 'किताबें और रीडिंग', icon: 'library', sort: 7 },
  { slug: 'weekend-trek', labelEn: 'Morning Trek', labelHi: 'सुबह का ट्रेक', icon: 'mountain', sort: 8 },
] as const;

export const INTERESTS: readonly LookupItem[] = [
  { slug: 'chai-cafe', labelEn: 'Chai & Cafes', labelHi: 'चाय और कैफ़े', icon: 'coffee', sort: 1 },
  { slug: 'board-games', labelEn: 'Board Games', labelHi: 'बोर्ड गेम्स', icon: 'dice-5', sort: 2 },
  { slug: 'study-sessions', labelEn: 'Study Buddy', labelHi: 'स्टडी बडी', icon: 'book-open', sort: 3 },
  { slug: 'evening-walks', labelEn: 'Riverfront Walks', labelHi: 'रिवरफ्रंट सैर', icon: 'footprints', sort: 4 },
  { slug: 'indie-music', labelEn: 'Acoustic & Indie', labelHi: 'म्यूज़िक और गिटार', icon: 'music', sort: 5 },
  { slug: 'cricket-badminton', labelEn: 'Badminton & Turf', labelHi: 'बैडमिंटन और टर्फ़', icon: 'trophy', sort: 6 },
  { slug: 'coding-tech', labelEn: 'Coding & Startups', labelHi: 'कोडिंग और टेक', icon: 'code', sort: 7 },
  { slug: 'photography', labelEn: 'Street Photography', labelHi: 'फ़ोटोग्राफ़ी', icon: 'camera', sort: 8 },
  { slug: 'quizzes-trivia', labelEn: 'Quizzes & Trivia', labelHi: 'क्विज़ और ट्रिविया', icon: 'sparkles', sort: 9 },
  { slug: 'anime-films', labelEn: 'Films & Anime', labelHi: 'फ़िल्में और एनीमे', icon: 'film', sort: 10 },
] as const;

export const REPORT_REASONS = [
  'harassment',
  'sexual_content',
  'threat_or_violence',
  'fake_profile',
  'underage',
  'spam_or_scam',
  'no_show',
  'unsafe_at_plan',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const SEVERE_REPORT_REASONS: readonly ReportReason[] = [
  'sexual_content',
  'threat_or_violence',
  'underage',
  'unsafe_at_plan',
] as const;

export function getReportSeverity(reason: ReportReason): 'severe' | 'standard' {
  return (SEVERE_REPORT_REASONS as readonly string[]).includes(reason) ? 'severe' : 'standard';
}
