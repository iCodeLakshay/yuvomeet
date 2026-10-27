import { TIMEZONE } from '@yuvomeet/shared';

// Intl formatters are expensive to build; create them once (js-hoist-intl).
const time = new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true });
const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, weekday: 'short' });
const dayMonth = new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, day: 'numeric', month: 'short' });
const fullDate = new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'short' });
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

const DAY = 86_400_000;

function relativeDay(iso: string): string | null {
  const diff = (Date.parse(dayKey.format(new Date(iso))) - Date.parse(dayKey.format(new Date()))) / DAY;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return null;
}

/** "Today 8:30 PM", "Tomorrow 5:30 PM", "Sat 7:00 PM". */
export function formatPlanTime(iso: string): string {
  const d = new Date(iso);
  return `${relativeDay(iso) ?? (Date.parse(iso) - Date.now() < 6 * DAY ? weekday.format(d) : dayMonth.format(d))} ${time.format(d).toUpperCase()}`;
}

export const formatTime = (iso: string) => time.format(new Date(iso)).toUpperCase();

export function formatDateLong(iso: string): string {
  return relativeDay(iso) ?? fullDate.format(new Date(iso));
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatDateLong(startIso)}, ${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/** "10m ago", "3h ago", "Yesterday", "Oct 18". */
export function formatAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  return relativeDay(iso) ?? dayMonth.format(new Date(iso));
}

/** "Starts in 40m", "Starts in 3h", "Started". */
export function formatStartsIn(iso: string): string {
  const mins = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (mins <= 0) return 'Started';
  if (mins < 60) return `Starts in ${mins}m`;
  if (mins < 24 * 60) return `Starts in ${Math.round(mins / 60)}h`;
  return formatPlanTime(iso);
}

export function initials(name: string | null | undefined): string {
  return (name ?? '?').trim().slice(0, 2).toUpperCase() || '?';
}
