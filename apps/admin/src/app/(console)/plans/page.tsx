import Link from 'next/link';
import { Badge, Card, Empty, LoadError, Page, Pager, SearchInput, Tabs, Toolbar, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, formatPaise, humanize, paging, searchTerm } from '@/lib/format';

const VIEWS: [string, string][] = [
  ['upcoming', 'Upcoming'],
  ['started', 'Happening now'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['all', 'All'],
];

type Search = { status?: string; q?: string; city?: string; page?: string; size?: string };

export default async function Plans({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const view = VIEWS.some(([v]) => v === sp.status) ? (sp.status as string) : 'upcoming';
  const term = searchTerm(sp.q);
  const city = sp.city && /^[0-9a-f-]{36}$/i.test(sp.city) ? sp.city : undefined;
  const { page, size, from, to } = paging(sp.page, sp.size);

  let q = supabase
    .from('plans')
    .select('id, title, status, starts_at, capacity, approved_count, audience, price_paise, late_cancel, host_id, activity, venues(name, area_name), cities(name)', { count: 'exact' })
    .range(from, to);
  if (view === 'upcoming') q = q.in('status', ['open', 'full']).order('starts_at');
  else if (view === 'all') q = q.order('starts_at', { ascending: false });
  else q = q.eq('status', view as 'started' | 'completed' | 'cancelled').order('starts_at', { ascending: false });
  if (term) q = q.ilike('title', `%${term}%`);
  if (city) q = q.eq('city_id', city);

  const [{ data: plans, count, error }, { data: cities }] = await Promise.all([q, supabase.from('cities').select('id, name').order('name')]);
  const hostIds = [...new Set((plans ?? []).map((p) => p.host_id).filter((x): x is string => Boolean(x)))];
  const { data: hosts } = hostIds.length ? await supabase.from('profiles').select('id, first_name').in('id', hostIds) : { data: [] };
  const hostName = new Map((hosts ?? []).map((h) => [h.id, h.first_name]));

  return (
    <Page title="Plans" icon="calendar" subtitle="Every meetup in every city. Open one to edit, cancel, or moderate its chat.">
      <Tabs base="/plans" param="status" value={view} keep={{ q: term || undefined, city }} items={VIEWS} />
      <Toolbar>
        <input type="hidden" name="status" value={view} />
        <SearchInput defaultValue={term} placeholder="Search plan titles" />
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
        {plans?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Host</th>
                  <th>Where</th>
                  <th>Starts</th>
                  <th className="num">Seats</th>
                  <th className="num">Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const venue = p.venues as { name: string; area_name: string } | null;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-main">
                          <Link href={`/plans/${p.id}`}>{p.title}</Link>
                          <span className="muted">
                            {humanize(p.activity)} · {humanize(p.audience)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <UserLink id={p.host_id} name={p.host_id ? hostName.get(p.host_id) : null} />
                      </td>
                      <td>
                        <div className="cell-main">
                          <span>{venue?.name ?? '—'}</span>
                          <span className="muted">
                            {venue?.area_name} · {(p.cities as { name: string } | null)?.name}
                          </span>
                        </div>
                      </td>
                      <td className="muted">{formatDateTime(p.starts_at)}</td>
                      <td className="num">
                        {p.approved_count} / {p.capacity}
                      </td>
                      <td className="num">{p.price_paise ? formatPaise(p.price_paise) : <span className="muted">Free</span>}</td>
                      <td>
                        <div className="row">
                          <Badge value={p.status} tone={p.status === 'open' ? 'success' : p.status === 'cancelled' ? 'danger' : undefined} />
                          {p.late_cancel ? <Badge value="late cancel" tone="warning" /> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="calendar">No plans match.</Empty>
        )}
      </Card>
      <Pager base="/plans" params={{ status: view, q: term || undefined, city }} page={page} total={count} size={size} />
    </Page>
  );
}
