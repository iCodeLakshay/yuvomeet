import { requireFullAdmin } from '@/lib/auth';

/** One CSV cell: quoted, and neutralised against spreadsheet formula injection (=, +, -, @). */
function cell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Landing-page waitlist as CSV, for launch emails. Admin-only (the view itself is gated too). */
export async function GET() {
  const { supabase } = await requireFullAdmin();
  const { data, error } = await supabase.from('admin_web_waitlist_entries').select('email, city, consent_text, consented_at, created_at').order('created_at').limit(50_000);
  if (error) return new Response('Export failed', { status: 500 });
  const rows = [['email', 'city', 'consent_text', 'consented_at', 'created_at'], ...(data ?? []).map((r) => [r.email, r.city, r.consent_text, r.consented_at, r.created_at])];
  const csv = rows.map((r) => r.map(cell).join(',')).join('\r\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hengout-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
