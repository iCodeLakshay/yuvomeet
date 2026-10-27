/**
 * S-9 & Implementation Plan §Analytics events:
 * Strictly typed, allow-listed analytics events and Sentry PII scrubber.
 * Never allows phone, name, photo URL, bio, message text, coordinates, or KYC details.
 */

export interface AnalyticsEventMap {
  otp_requested: { resend: boolean };
  otp_verified: { new_user: boolean };
  city_selected: { city_status: 'waitlist' | 'beta' | 'live' };
  profile_completed: { photo_count: number; interest_count: number };
  verification_started: { attempt: number };
  verification_passed: { attempt: number; manual: boolean };
  verification_failed: {
    check_type: 'id_age' | 'liveness_face' | 'gender';
    outcome: 'fail' | 'review' | 'minor';
  };
  appeal_submitted: { subject: 'verification' | 'suspension' | 'content' | 'ban' };
  plan_viewed: {
    plan_id: string;
    audience: 'everyone' | 'women_only' | 'same_college';
    activity: string;
    source: 'feed' | 'link' | 'my_plans';
  };
  join_requested: { plan_id: string };
  join_approved: { plan_id: string; wait_minutes: number };
  plan_created: {
    plan_id: string;
    activity: string;
    audience: 'everyone' | 'women_only' | 'same_college';
    capacity: number;
    lead_hours: number;
  };
  check_in: { plan_id: string; minutes_from_start: number };
  plan_completed: { plan_id: string; attended_count: number };
  plan_cancelled: { plan_id: string; late: boolean; by: 'host' | 'admin' };
  report_submitted: {
    reason: string;
    severity: 'severe' | 'standard';
    context: 'profile' | 'plan' | 'message';
  };
  user_blocked: { context: 'profile' | 'plan' | 'message' };
  sos_pressed: { plan_id: string; location_sent: boolean };
  rating_submitted: { plan_id: string; rated_count: number };
  paywall_viewed: { trigger: string };
  subscription_started: { product_id: string };
  ticket_purchased: { plan_id: string; amount_paise: number };
  venue_offer_redeemed: { venue_id: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

const ALLOWED_KEYS_BY_EVENT: { [K in AnalyticsEventName]: readonly (keyof AnalyticsEventMap[K])[] } = {
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
  paywall_viewed: ['trigger'],
  subscription_started: ['product_id'],
  ticket_purchased: ['plan_id', 'amount_paise'],
  venue_offer_redeemed: ['venue_id'],
};

const FORBIDDEN_PII_KEY_PATTERN =
  /phone|mobile|msisdn|name|first_name|bio|body|message|lat|lng|latitude|longitude|aadhaar|dob|birth|email|photo|avatar|token/i;

export function sanitizeAnalyticsPayload<K extends AnalyticsEventName>(
  event: K,
  props: AnalyticsEventMap[K],
  citySlug = 'kota',
): Record<string, string | number | boolean> {
  const allowedKeys = ALLOWED_KEYS_BY_EVENT[event] as readonly string[];
  const sanitized: Record<string, string | number | boolean> = {
    city: citySlug,
  };

  for (const key of allowedKeys) {
    if (FORBIDDEN_PII_KEY_PATTERN.test(key)) {
      continue;
    }
    const val = (props as Record<string, unknown>)[key];
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * S-9: Sentry `beforeSend` scrubber.
 * Strips request bodies, query strings, text-input breadcrumbs, and any PII fields.
 * Ensures `user` context contains ONLY `{ id }`.
 */
export function scrubSentryEvent<T extends Record<string, any>>(event: T): T {
  const cloned = structuredClone(event);

  if (cloned.user) {
    cloned.user = cloned.user.id ? { id: String(cloned.user.id) } : undefined;
  }

  if (cloned.request) {
    delete cloned.request.data;
    delete cloned.request.query_string;
    delete cloned.request.cookies;
    delete cloned.request.headers;
  }

  if (Array.isArray(cloned.breadcrumbs)) {
    cloned.breadcrumbs = cloned.breadcrumbs
      .filter((b: Record<string, any>) => b?.category !== 'ui.input')
      .map((b: Record<string, any>) => {
        if (b?.data && typeof b.data === 'object') {
          const cleanData: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(b.data)) {
            if (!FORBIDDEN_PII_KEY_PATTERN.test(k)) {
              cleanData[k] = v;
            }
          }
          return { ...b, data: cleanData };
        }
        return b;
      });
  }

  if (cloned.extra && typeof cloned.extra === 'object') {
    for (const key of Object.keys(cloned.extra)) {
      if (FORBIDDEN_PII_KEY_PATTERN.test(key)) {
        delete cloned.extra[key];
      }
    }
  }

  return cloned;
}
