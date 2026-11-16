import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Empty, LoadError, Page, Pager, SearchInput, Toolbar } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDate, humanize, paging, searchTerm } from '@/lib/format';
import { UUID } from '@/lib/validate';
import { findUserByEmail } from '../manage-actions';

const STATUSES = ['onboarding', 'active', 'suspended', 'banned', 'deleted'] as const;
const VERIFICATION = ['unverified', 'pending', 'manual_review', 'verified', 'rejected', 'blocked_minor'] as const;

type Search = { q?: string; status?: string; verification?: string; city?: string; page?: string; size?: string };

/** AD-2 lookup by first name or user id (and by email for admins). Phone numbers are never shown (S-6). */
export default async function Users({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase, role } = await requireAdmin();
  const sp = await searchParams;
  const term = searchTerm(sp.q);
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? (sp.status as (typeof STATUSES)[number]) : undefined;
  const verification = VERIFICATION.includes(sp.verification as (typeof VERIFICATION)[number]) ? (sp.verification as (typeof VERIFICATION)[number]) : undefined;
  const city = sp.city && UUID.test(sp.city) ? sp.city : undefined;
  const { page, size, from, to } = paging(sp.page, sp.size);

  let query = supabase.from('admin_user_summary').select('id, first_name, city_id, status, verification_status, reports_received, reports_given, plans_attended, plans_no_show, late_cancel_count_30d, unsafe_ratings_30d, created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (UUID.test(term)) query = query.eq('id', term);
  else if (term) query = query.ilike('first_name', `%${term}%`);
  if (status) query = query.eq('status', status);
  if (verification) query = query.eq('verification_status', verification);
  if (city) query = query.eq('city_id', city);
  const [{ data: users, count, error }, { data: cities }] = await Promise.all([query, supabase.from('cities').select('id, name').order('name')]);
  const cityName = new Map((cities ?? []).map((c) => [c.id, c.name]));

  return (
    <Page
      title="Members"
      icon="users"
      subtitle="Search by first name or user id. Open a member to see everything about them and act on the account."
      actions={
        role === 'admin' ? (
          <ActionForm
            dialog={{ label: 'Find by email', icon: 'mail', title: 'Find a member by email', description: 'For support requests that arrive by email.' }}
            action={findUserByEmail}
            reason={false}
            buttons={[{ label: 'Find', icon: 'search', tone: 'primary' }]}
          >
            <label className="field">
              <span>Sign-in email</span>
              <input name="email" type="email" required autoComplete="off" />
            </label>
          </ActionForm>
        ) : null
      }
    >
      <Toolbar>
        <SearchInput defaultValue={term} placeholder="First name or user id" />
        <select name="status" defaultValue={status ?? ''} aria-label="Status">
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <select name="verification" defaultValue={verification ?? ''} aria-label="Verification">
          <option value="">Any verification</option>
          {VERIFICATION.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <select name="city" defaultValue={city ?? ''} aria-label="City">
          <option value="">All cities</option>
          {(cities ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Toolbar>
      <LoadError error={error} />
      <Card flush>
        {users?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th className="num">Reports in / out</th>
                  <th className="num">Attended / no-show</th>
                  <th className="num">Late cancels 30d</th>
                  <th className="num">Unsafe 30d</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row">
                        <span className="avatar" aria-hidden="true">
                          {(u.first_name?.[0] ?? '?').toUpperCase()}
                        </span>
                        <div className="cell-main">
                          <Link href={`/users/${u.id}`}>{u.first_name || u.id?.slice(0, 8)}</Link>
                          <span className="muted">{(u.city_id && cityName.get(u.city_id)) || 'No city'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge value={u.status} />
                    </td>
                    <td>
                      <Badge value={u.verification_status} />
                    </td>
                    <td className="num">
                      {u.reports_received ?? 0} / {u.reports_given ?? 0}
                    </td>
                    <td className="num">
                      {u.plans_attended ?? 0} / {u.plans_no_show ?? 0}
                    </td>
                    <td className="num">{u.late_cancel_count_30d ?? 0}</td>
                    <td className={`num${(u.unsafe_ratings_30d ?? 0) > 0 ? ' error' : ''}`}>{u.unsafe_ratings_30d ?? 0}</td>
                    <td className="muted">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="users">No members match.</Empty>
        )}
      </Card>
      <Pager base="/users" params={{ q: term || undefined, status, verification, city }} page={page} total={count} size={size} />
    </Page>
  );
}
