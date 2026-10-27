/**
 * Form checks shared by the app and Edge Functions. Each returns an error message or null.
 * They mirror server rules so users get instant feedback; the database re-checks everything.
 */

import {
  MAX_PLAN_CAPACITY,
  MAX_PLAN_DURATION_HOURS,
  MIN_PLAN_CAPACITY,
  OTP_LENGTH,
  PLAN_CUTOFF_LOCAL_HOUR,
  PLAN_MIN_LEAD_HOURS,
  TIMEZONE,
} from './constants.ts';
import { SCREEN_MESSAGES, screenText } from './screening.ts';

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/** Returns the E.164 number for a 10-digit Indian mobile, or null. */
export function toE164India(input: string): string | null {
  const digits = input.replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
  return INDIAN_MOBILE.test(digits) ? `+91${digits}` : null;
}

export function isOtpCode(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

export function checkText(value: string, label: string, min: number, max: number): string | null {
  const length = value.trim().length;
  if (length < min) return min <= 1 ? `Add ${label.toLowerCase()}.` : `${label} needs at least ${min} characters.`;
  if (length > max) return `${label} can be at most ${max} characters.`;
  const reason = screenText(value);
  return reason ? SCREEN_MESSAGES[reason] : null;
}

const istParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function ist(ms: number) {
  const parts = Object.fromEntries(istParts.formatToParts(ms).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export interface PlanTimingInput {
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  lateEventsAllowed: boolean;
  nowMs?: number;
}

/** S-31, S-32: lead time, duration, capacity and the 21:00 IST cut-off. */
export function checkPlanTiming(input: PlanTimingInput): string | null {
  const start = input.startsAt.getTime();
  const end = input.endsAt.getTime();
  const now = input.nowMs ?? Date.now();
  if (start < now + PLAN_MIN_LEAD_HOURS * 3_600_000) return `Plans must start at least ${PLAN_MIN_LEAD_HOURS} hours from now.`;
  if (end - start < 30 * 60_000 || end - start > MAX_PLAN_DURATION_HOURS * 3_600_000) {
    return `Plans last between 30 minutes and ${MAX_PLAN_DURATION_HOURS} hours.`;
  }
  if (input.capacity < MIN_PLAN_CAPACITY || input.capacity > MAX_PLAN_CAPACITY) {
    return `Group size must be ${MIN_PLAN_CAPACITY} to ${MAX_PLAN_CAPACITY}.`;
  }
  if (!input.lateEventsAllowed) {
    const s = ist(start);
    const e = ist(end);
    if (s.day !== e.day || e.minutes > PLAN_CUTOFF_LOCAL_HOUR * 60) {
      return 'Plans must end by 9:00 PM unless the venue is a late-evening partner.';
    }
  }
  return null;
}
