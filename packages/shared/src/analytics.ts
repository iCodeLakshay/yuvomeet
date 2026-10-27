/**
 * S-9: typed, allow-listed analytics events and the Sentry PII scrubber.
 * Event names are fixed in docs/implementation-plan.md. Properties never carry
 * phone, name, photo, bio, message text, coordinates, gender of a person, or KYC data.
 */

type Audience = 'everyone' | 'women_only' | 'same_college';

export interface AnalyticsEventMap {
  otp_requested: { resend: boolean };
  otp_verified: { new_user: boolean };
  city_selected: { city_status: 'waitlist' | 'beta' | 'live' };
  profile_completed: { photo_count: number; interest_count: number };
  verification_started: { attempt: number };
  verification_passed: { attempt: number; manual: boolean };
  verification_failed: { check_type: 'id_age' | 'liveness_face' | 'gender'; outcome: 'fail' | 'review' | 'minor' };
  appeal_submitted: { subject: 'verification' | 'suspension' | 'content' | 'ban' };
  plan_viewed: { plan_id: string; audience: Audience; activity: string; source: 'feed' | 'link' | 'my_plans' };
  join_requested: { plan_id: string };
  join_approved: { plan_id: string; wait_minutes: number };
  plan_created: { plan_id: string; activity: string; audience: Audience; capacity: number; lead_hours: number };
  check_in: { plan_id: string; minutes_from_start: number };
  plan_completed: { plan_id: string; attended_count: number };
  plan_cancelled: { plan_id: string; late: boolean; by: 'host' | 'admin' };
  report_submitted: { reason: string; severity: 'severe' | 'standard'; context: 'profile' | 'plan' | 'message' };
  user_blocked: { context: 'profile' | 'plan' | 'message' };
  sos_pressed: { plan_id: string; location_sent: boolean };
  rating_submitted: { plan_id: string; rated_count: number };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

const ALLOWED_KEYS: { [K in AnalyticsEventName]: readonly (keyof AnalyticsEventMap[K])[] } = {
  otp_requested: ['resend'],
  otp_verified: ['new_user'],
  city_selected: ['city_status'],
  profile_completed: ['photo_count', 'interest_count'],
  verification_started: ['attempt'],
  verification_passed: ['attempt', 'manual'],
  verification_failed: ['check_type', 'outcome'],
  appeal_submitted: ['subject'],
  plan_viewed: ['plan_id', 'audience', 'activity', 'source'],
  join_requested: ['plan_id'],
  join_approved: ['plan_id', 'wait_minutes'],
  plan_created: ['plan_id', 'activity', 'audience', 'capacity', 'lead_hours'],
  check_in: ['plan_id', 'minutes_from_start'],
  plan_completed: ['plan_id', 'attended_count'],
  plan_cancelled: ['plan_id', 'late', 'by'],
  report_submitted: ['reason', 'severity', 'context'],
  user_blocked: ['context'],
  sos_pressed: ['plan_id', 'location_sent'],
  rating_submitted: ['plan_id', 'rated_count'],
};

export type SafeProps = Record<string, string | number | boolean>;

/** Keeps only allow-listed primitive properties and adds the city slug. */
export function sanitizeAnalyticsPayload<K extends AnalyticsEventName>(
  event: K,
  props: AnalyticsEventMap[K],
  citySlug: string,
): SafeProps {
  const out: SafeProps = { city: citySlug };
  for (const key of ALLOWED_KEYS[event] as readonly string[]) {
    const value = (props as Record<string, unknown>)[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

const PII_KEY = /phone|mobile|msisdn|name|bio|body|message|text|lat|lng|latitude|longitude|aadhaar|dob|birth|email|photo|avatar|token|address|location/i;

function stripPii(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => stripPii(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (!PII_KEY.test(key)) out[key] = stripPii(v, depth + 1);
  }
  return out;
}

/** S-9: Sentry beforeSend. User context is reduced to `{ id }`; bodies, inputs and PII keys go. */
export function scrubSentryEvent<T extends object>(event: T): T {
  const e = event as Record<string, unknown> & {
    user?: { id?: string | number };
    request?: { url?: string };
    breadcrumbs?: { category?: string; data?: unknown }[];
  };
  const scrubbed: Record<string, unknown> = { ...e };
  scrubbed.user = e.user?.id ? { id: String(e.user.id) } : undefined;
  if (e.request) scrubbed.request = e.request.url ? { url: e.request.url.split('?')[0] } : {};
  if (e.breadcrumbs) {
    scrubbed.breadcrumbs = e.breadcrumbs
      .filter((b) => b.category !== 'ui.input' && b.category !== 'console')
      .map((b) => ({ ...b, data: stripPii(b.data) }));
  }
  if (e.extra) scrubbed.extra = stripPii(e.extra);
  if (e.contexts) scrubbed.contexts = stripPii(e.contexts);
  return scrubbed as T;
}
