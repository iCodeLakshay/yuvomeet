// Intl formatters are built once.
const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : '—');

/** "in 3h" / "2h overdue": SLA countdowns for the queue and appeals. */
export function formatDue(iso: string): { label: string; overdue: boolean } {
  const mins = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  const abs = Math.abs(mins);
  const span = abs < 60 ? `${abs}m` : abs < 48 * 60 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`;
  return mins >= 0 ? { label: `in ${span}`, overdue: false } : { label: `${span} overdue`, overdue: true };
}

export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : '—');

export const humanize = (value: string | null | undefined) => (value ? value.replace(/_/g, ' ') : '—');
