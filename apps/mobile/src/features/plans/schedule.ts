import { PLAN_CUTOFF_LOCAL_HOUR, PLAN_MIN_LEAD_HOURS, TIMEZONE } from '@yuvomeet/shared';

const IST_OFFSET = 5.5 * 3_600_000;
const DAY = 86_400_000;
const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, weekday: 'short' });
const dayMonth = new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, day: 'numeric', month: 'short' });

export interface DayOption {
  key: number; // UTC ms of 00:00 IST
  label: string;
  sub: string;
}

/** The next 14 days in IST, labelled Today / Tomorrow / Sat. */
export function dayOptions(now = Date.now()): DayOption[] {
  const ist = new Date(now + IST_OFFSET);
  const today = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET;
  return Array.from({ length: 14 }, (_, i) => {
    const key = today + i * DAY;
    const d = new Date(key + 12 * 3_600_000);
    return { key, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday.format(d), sub: dayMonth.format(d) };
  });
}

/** Start times every 30 minutes from 07:00 IST that still respect the lead time (S-31). */
export function timeOptions(dayKey: number, now = Date.now(), lateAllowed = false): number[] {
  const lastStart = (lateAllowed ? 23 : PLAN_CUTOFF_LOCAL_HOUR - 0.5) * 60;
  const out: number[] = [];
  for (let m = 7 * 60; m <= lastStart; m += 30) {
    if (dayKey + m * 60_000 >= now + PLAN_MIN_LEAD_HOURS * 3_600_000) out.push(m);
  }
  return out;
}

export const atMinutes = (dayKey: number, minutes: number) => new Date(dayKey + minutes * 60_000);

export function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
