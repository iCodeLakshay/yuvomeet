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

const date = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' });
export const formatDate = (iso: string | null | undefined) => (iso ? date.format(new Date(iso)) : '—');

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
/** Money is stored in paise (integers); shown as ₹1,234.50. */
export const formatPaise = (paise: number | null | undefined) => (paise == null ? '—' : rupees.format(paise / 100));

const count = new Intl.NumberFormat('en-IN');
export const formatCount = (n: number | null | undefined) => count.format(n ?? 0);

/** "3h ago" for activity feeds. */
export function formatAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export const PAGE_SIZE = 50;

export const PAGE_SIZES = [10, 25, 50, 100] as const;

/**
 * Reads ?page= (and optionally ?size=) and returns the PostgREST range for it, so every list asks the
 * database for one page only. A size outside PAGE_SIZES falls back to the default.
 */
export function paging(raw: string | undefined, size: number | string | undefined = PAGE_SIZE) {
  const n = typeof size === 'string' ? Number.parseInt(size, 10) : size;
  const s = (PAGE_SIZES as readonly number[]).includes(n ?? NaN) ? (n as number) : PAGE_SIZE;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(raw ?? '1', 10) || 1));
  return { page, size: s, from: (page - 1) * s, to: page * s - 1 };
}

/** Strips PostgREST filter syntax and LIKE wildcards from a free-text search term. */
export const searchTerm = (raw: string | undefined) => (raw ?? '').trim().replace(/[%_,()*\\]/g, '').slice(0, 80);

export const shortId =(id: string | null | undefined) => (id ? id.slice(0, 8) : '—');

export const humanize = (value: string | null | undefined) => (value ? value.replace(/_/g, ' ') : '—');
