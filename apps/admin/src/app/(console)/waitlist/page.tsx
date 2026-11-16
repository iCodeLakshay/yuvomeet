import { ActionForm } from '@/components/ActionForm';
import { Icon } from '@/components/Icon';
import { Card, ClientTable, Empty, LoadError, Page, Pager, SearchInput, Stat, Toolbar } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { formatAgo, formatCount, formatDateTime, paging, searchTerm } from '@/lib/format';
import { deleteWebWaitlist } from '../manage-actions';

/** Demand for cities that are not live yet: members who picked a waitlist city, and landing-page signups. */
export default async function Waitlist({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; page?: string; size?: string }> }) {
  const { supabase } = await requireFullAdmin();
  const sp = await searchParams;
  const term = searchTerm(sp.q);
  const city = searchTerm(sp.city);
  const { page, size, from, to } = paging(sp.page, sp.size);

  let q = supabase.from('admin_web_waitlist_entries').select('id, email, city, consent_text, created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (term) q = q.ilike('email', `%${term}%`);
  if (city) q = q.ilike('city', city);
  const [{ data: entries, count, error }, { data: inApp }, { data: web }] = await Promise.all([
    q,
    supabase.from('admin_city_waitlist').select('id, name, status, waitlist_count').order('waitlist_count', { ascending: false }),
    supabase.from('admin_web_waitlist').select('city, signups, latest').order('signups', { ascending: false }),
  ]);
  const inAppTotal = (inApp ?? []).reduce((s, c) => s + (c.waitlist_count ?? 0), 0);
  const webTotal = (web ?? []).reduce((s, c) => s + (c.signups ?? 0), 0);

  return (
    <Page
      title="Waitlist"
      icon="list"
      subtitle="Who is waiting for Hengout, and where. Use it to pick the next city."
      actions={
        // A plain link: a Next <Link> would prefetch (and so run) the export.
        <a className="btn" href="/waitlist/export" download>
          <Icon name="file" />
          <span>Export CSV</span>
        </a>
      }
    >
      <div className="stats">
        <Stat label="Members waiting in the app" value={formatCount(inAppTotal)} icon="users" tone="accent" />
        <Stat label="Landing-page signups" value={formatCount(webTotal)} icon="mail" tone="accent" />
        <Stat label="Cities with demand" value={formatCount(new Set([...(web ?? []).map((w) => w.city?.toLowerCase()), ...(inApp ?? []).filter((c) => (c.waitlist_count ?? 0) > 0).map((c) => c.name?.toLowerCase())]).size)} icon="building" />
      </div>

      <div className="grid2">
        <Card title="In the app, by city" icon="users" flush>
          {inApp?.some((c) => (c.waitlist_count ?? 0) > 0) ? (
            <ClientTable pageSize={10} label="cities">
              {inApp
                .filter((c) => (c.waitlist_count ?? 0) > 0)
                .map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="muted">{c.status}</td>
                    <td className="num">{formatCount(c.waitlist_count)}</td>
                  </tr>
                ))}
            </ClientTable>
          ) : (
            <Empty icon="users">Nobody is waiting in the app.</Empty>
          )}
        </Card>
        <Card title="From the website, by city" icon="mail" flush>
          {web?.length ? (
            <ClientTable pageSize={10} label="cities">
              {web.map((c) => (
                <tr key={c.city}>
                  <td>{c.city}</td>
                  <td className="muted">latest {formatAgo(c.latest)}</td>
                  <td className="num">{formatCount(c.signups)}</td>
                </tr>
              ))}
            </ClientTable>
          ) : (
            <Empty icon="mail">No website signups yet.</Empty>
          )}
        </Card>
      </div>

      <Card title="Website signups" icon="mail">
        <Toolbar>
          <SearchInput defaultValue={term} placeholder="Search email" />
          <input name="city" defaultValue={city} placeholder="City" aria-label="City" />
        </Toolbar>
        <LoadError error={error} />
        {entries?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>City</th>
                  <th>Consent</th>
                  <th>Signed up</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.email}</td>
                    <td>{e.city}</td>
                    <td className="muted small" style={{ maxWidth: 280 }}>
                      {e.consent_text}
                    </td>
                    <td className="muted">{formatDateTime(e.created_at)}</td>
                    <td className="actions">
                      <ActionForm
                        dialog={{ label: '', icon: 'trash', tone: 'danger', compact: true, title: 'Remove signup', description: 'For erasure requests and spam. The email is not kept in the audit log.' }}
                        action={deleteWebWaitlist}
                        hidden={{ entry_id: String(e.id) }}
                        buttons={[{ label: 'Remove', tone: 'danger', icon: 'trash' }]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="mail">No signups match.</Empty>
        )}
        <Pager base="/waitlist" params={{ q: term || undefined, city: city || undefined }} page={page} total={count} size={size} />
      </Card>
    </Page>
  );
}
