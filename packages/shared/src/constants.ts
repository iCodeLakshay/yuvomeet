/**
 * Product constants for UI copy and instant client checks.
 * The authoritative values live in `private.settings` (supabase/migrations/..._baseline_data.sql);
 * the server always re-checks.
 */

export const FREE_JOINS_PER_WEEK = 2; // S-25, SB-1
export const FREE_HOSTS_PER_WEEK = 1; // S-26, PL-1
export const PLAN_MIN_LEAD_HOURS = 3; // S-31
export const PLAN_CUTOFF_LOCAL_HOUR = 21; // S-32, SF-6 (21:00 Asia/Kolkata)
export const MAX_PLAN_DURATION_HOURS = 6; // S-32
export const MIN_PLAN_CAPACITY = 3; // S-31
export const MAX_PLAN_CAPACITY = 10; // S-31
export const CHECKIN_RADIUS_M = 150; // S-36, PL-6
export const CHECKIN_WINDOW_MIN = 30; // S-36, PL-6
export const CHECKIN_MAX_ACCURACY_M = 100; // S-36
export const OTP_LENGTH = 6;
export const OTP_RESEND_COOLDOWN_SEC = 60; // S-11
export const MIN_PROFILE_PHOTOS = 2; // ON-3
export const MAX_PROFILE_PHOTOS = 6; // ON-3
export const MIN_INTERESTS = 2; // ON-3
export const MAX_INTERESTS = 8;
export const MAX_BIO_CHARS = 300; // ON-3
export const MAX_MESSAGE_CHARS = 1000;
export const MAX_JOIN_NOTE_CHARS = 140; // PL-3
export const MAX_REPORT_DETAILS_CHARS = 1000;
export const MIN_APPEAL_CHARS = 10; // VR-6
export const MAX_APPEAL_CHARS = 1000;
export const FEED_PAGE_SIZE = 20; // architecture.md §Feed
export const SIGNED_URL_TTL_SEC = 60; // S-22
/** Largest stored image. Matches the `quarantine` and `media` bucket file_size_limit. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Largest photo the app will try to open before re-encoding (phone cameras exceed 8 MB). */
export const MAX_PICK_BYTES = 25 * 1024 * 1024;
/**
 * Formats the app accepts from the gallery or camera. Every one is decoded on the device and
 * re-encoded to JPEG (EXIF dropped) before upload, so storage and moderation only ever see
 * JPEG. HEIC/HEIF come from iPhone cameras; AVIF needs Android 12+ / iOS 16+ to decode.
 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'] as const;
export const ACCEPTED_IMAGE_LABEL = 'JPEG, PNG, WebP, GIF or AVIF';
export const EMERGENCY_HELPLINE = '112'; // SF-3
export const TIMEZONE = 'Asia/Kolkata';
export const POLICY_VERSION = '2026-10';

/** Kota areas: display name plus the coarse H3 res-8 cell stored on the profile (S-18). */
export const KOTA_AREAS = [
  { name: 'Talwandi', cell: '883d8b4491fffff' },
  { name: 'Vigyan Nagar', cell: '883d8b4493fffff' },
  { name: 'Mahaveer Nagar', cell: '883d8b4495fffff' },
  { name: 'Rajeev Gandhi Nagar', cell: '883d8b4497fffff' },
  { name: 'Jawahar Nagar', cell: '883d8b4499fffff' },
  { name: 'Kunhari', cell: '883d8b449bfffff' },
  { name: 'Coral Park', cell: '883d8b449dfffff' },
  { name: 'Riverfront', cell: '883d8b449ffffff' },
] as const;

export const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or inappropriate behaviour', icon: 'warning-amber' },
  { value: 'unsafe_at_plan', label: 'Felt unsafe at the meetup', icon: 'health-and-safety' },
  { value: 'sexual_content', label: 'Sexual or explicit content', icon: 'block' },
  { value: 'threat_or_violence', label: 'Threat or violence', icon: 'report-problem' },
  { value: 'fake_profile', label: 'Fake profile', icon: 'no-accounts' },
  { value: 'underage', label: 'Looks under 18', icon: 'gpp-bad' },
  { value: 'no_show', label: 'No-show to a meetup', icon: 'event-busy' },
  { value: 'spam_or_scam', label: 'Spam or scam', icon: 'report' },
  { value: 'other', label: 'Something else', icon: 'more-horiz' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

const SEVERE_REASONS: readonly ReportReason[] = ['sexual_content', 'threat_or_violence', 'underage', 'unsafe_at_plan'];

export function getReportSeverity(reason: ReportReason): 'severe' | 'standard' {
  return SEVERE_REASONS.includes(reason) ? 'severe' : 'standard';
}
