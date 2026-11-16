import Link from 'next/link';
import { Card, Empty, LoadError, Page, Pager, Toolbar } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, humanize, paging, searchTerm } from '@/lib/format';
import { UUID } from '@/lib/validate';

const SUBJECT_LINK: Record<string, (id: string) => string> = {
  user: (id) => `/users/${id}`,
  plan: (id) => `/plans/${id}`,
  venue: (id) => `/venues/${id}`,
  city: () => '/cities',
  college: () => '/colleges',
  report: () => '/reports',
  payment: () => '/payments',
  setting: () => '/settings',
  screen_term: () => '/settings/filters',
  interest: () => '/catalog',
  activity: () => '/catalog',
  web_waitlist: () => '/waitlist',
};

const TYPES = ['user', 'plan', 'venue', 'city', 'college', 'report', 'message', 'payment', 'setting', 'screen_term', 'interest', 'activity', 'photo', 'text', 'verification', 'appeal'];

type Search = { subject?: string; admin?: string; type?: string; action?: string; page?: string; size?: string };

/** S-45, S-46: insert-only log. Reviewers see their own actions; admins see everyone's. */
export default async function Audit({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase, role } = await requireAdmin();
  const sp = await searchParams;
  const subject = sp.subject && UUID.test(sp.subject) ? sp.subject : undefined;
  const admin = sp.admin && UUID.test(sp.admin) ? sp.admin : undefined;
  const type = TYPES.includes(sp.type ?? '') ? sp.type : undefined;
  const action = searchTerm(sp.action);
  const { page, size, from, to } = paging(sp.page, sp.size);

  let q = supabase
    .from('audit_log')
    .select('id, created_at, admin_id, action, subject_type, subject_id, reason, before, after', { count: 'exact' })
    .order('id', { ascending: false })
    .range(from, to);
  if (subject) q = q.eq('subject_id', subject);
  if (admin) q = q.eq('admin_id', admin);
  if (type) q = q.eq('subject_type', type);
  if (action) q = q.ilike('action', `%${action}%`);
  const { data: rows, count, error } = await q;

  return (
    <Page title="Audit log" icon="history" subtitle={role === 'admin' ? 'Every admin action, newest first. Records cannot be edited or deleted.' : 'Your actions, newest first.'}>
      <Toolbar>
        <select name="type" defaultValue={type ?? ''} aria-label="Record type">
          <option value="">Any record</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {humanize(t)}
            </option>
          ))}
        </select>
        <input name="action" defaultValue={action} placeholder="Action, e.g. ban" aria-label="Action" />
        <input name="admin" defaultValue={admin} placeholder="Staff id" aria-label="Staff id" />
        <input name="subject" defaultValue={subject} placeholder="Record id" aria-label="Record id" />
      </Toolbar>
      <LoadError error={error} />
      <Card flush>
        {rows?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Staff</th>
                  <th>Action</th>
                  <th>Record</th>
                  <th>Reason</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const href = SUBJECT_LINK[r.subject_type]?.(r.subject_id);
                  const label = r.subject_id === '00000000-0000-0000-0000-000000000000' ? humanize(r.subject_type) : `${humanize(r.subject_type)} ${r.subject_id.slice(0, 8)}`;
                  return (
                    <tr key={r.id}>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(r.created_at)}
                      </td>
                      <td>
                        <Link href={`/audit?admin=${r.admin_id}`}>{r.admin_id.slice(0, 8)}</Link>
                      </td>
                      <td>
                        <strong>{humanize(r.action)}</strong>
                      </td>
                      <td>{href ? <Link href={href}>{label}</Link> : label}</td>
                      <td style={{ maxWidth: 260 }}>{r.reason}</td>
                      <td style={{ maxWidth: 320 }}>
                        <code>{r.before || r.after ? `${JSON.stringify(r.before ?? {})} → ${JSON.stringify(r.after ?? {})}` : ''}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="history">No actions recorded.</Empty>
        )}
      </Card>
      <Pager base="/audit" params={{ subject, admin, type, action: action || undefined }} page={page} total={count} size={size} />
    </Page>
  );
}
