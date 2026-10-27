import Link from 'next/link';
import { Empty, Page, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';

const SUBJECT_LINK: Record<string, (id: string) => string> = {
  user: (id) => `/users/${id}`,
  plan: (id) => `/plans/${id}`,
  venue: (id) => `/venues/${id}`,
};

/** S-45, S-46: insert-only log. Reviewers see their own actions; admins see everyone's. */
export default async function Audit({ searchParams }: { searchParams: Promise<{ subject?: string; before?: string }> }) {
  const { supabase, role } = await requireAdmin();
  const { subject, before } = await searchParams;
  let q = supabase.from('audit_log').select('*').order('id', { ascending: false }).limit(100);
  if (subject) q = q.eq('subject_id', subject);
  if (before) q = q.lt('id', Number(before));
  const { data: rows, error } = await q;
  const last = rows?.at(-1)?.id;

  return (
    <Page title="Audit log" subtitle={role === 'admin' ? 'All admin actions.' : 'Your actions.'}>
      {error ? <p className="error">{error.message}</p> : null}
      {rows?.length ? (
        <>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Subject</th>
                <th>Reason</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = SUBJECT_LINK[r.subject_type]?.(r.subject_id);
                return (
                  <tr key={r.id}>
                    <td className="muted">{formatDateTime(r.created_at)}</td>
                    <td>
                      <UserLink id={r.admin_id} />
                    </td>
                    <td>{humanize(r.action)}</td>
                    <td>{href ? <Link href={href}>{`${r.subject_type} ${r.subject_id.slice(0, 8)}`}</Link> : `${r.subject_type} ${r.subject_id.slice(0, 8)}`}</td>
                    <td>{r.reason}</td>
                    <td>
                      <code>{r.before || r.after ? `${JSON.stringify(r.before ?? {})} → ${JSON.stringify(r.after ?? {})}` : ''}</code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 100 && last ? <Link href={`/audit?before=${last}${subject ? `&subject=${subject}` : ''}`}>Older</Link> : null}
        </>
      ) : (
        <Empty>No actions recorded.</Empty>
      )}
    </Page>
  );
}
