import Link from 'next/link';
import { Badge, Empty, Page } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** AD-2 lookup by first name or user id. Phone numbers are never shown (S-6). */
export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { supabase } = await requireAdmin();
  const { q = '', status = '' } = await searchParams;
  let query = supabase.from('admin_user_summary').select('*').order('created_at', { ascending: false }).limit(50);
  const term = q.trim();
  if (UUID.test(term)) query = query.eq('id', term);
  else if (term) query = query.ilike('first_name', `%${term.replace(/[%_]/g, '')}%`);
  if (status) query = query.eq('status', status as 'active');
  const { data: users, error } = await query;

  return (
    <Page title="Users">
      <form className="row">
        <input name="q" defaultValue={q} placeholder="First name or user id" aria-label="Search users" />
        <select name="status" defaultValue={status} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <button className="btn">Search</button>
      </form>
      {error ? <p className="error">{error.message}</p> : null}
      {users?.length ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Verification</th>
              <th>Reports in / out</th>
              <th>Attended / no-show</th>
              <th>Late cancels 30d</th>
              <th>Unsafe 30d</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/users/${u.id}`}>{u.first_name || u.id?.slice(0, 8)}</Link>
                </td>
                <td>
                  <Badge value={u.status} />
                </td>
                <td>
                  <Badge value={u.verification_status} />
                </td>
                <td>
                  {u.reports_received ?? 0} / {u.reports_given ?? 0}
                </td>
                <td>
                  {u.plans_attended ?? 0} / {u.plans_no_show ?? 0}
                </td>
                <td>{u.late_cancel_count_30d ?? 0}</td>
                <td className={(u.unsafe_ratings_30d ?? 0) > 0 ? 'error' : undefined}>{u.unsafe_ratings_30d ?? 0}</td>
                <td>{formatDateTime(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>No members match.</Empty>
      )}
    </Page>
  );
}
