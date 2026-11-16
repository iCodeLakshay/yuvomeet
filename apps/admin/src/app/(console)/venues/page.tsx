import Link from 'next/link';
import { Badge, Card, Empty, LinkButton, LoadError, Page, Pager, SearchInput, Tabs, Toolbar } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { paging, searchTerm } from '@/lib/format';
import { UUID } from '@/lib/validate';

const VIEWS: [string, string][] = [
  ['all', 'All'],
  ['approved', 'Approved'],
  ['draft', 'Drafts'],
  ['archived', 'Archived'],
];

/** SF-1, S-31: every plan happens at an approved venue. Admins create and approve them. */
export default async function Venues({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; city?: string; page?: string; size?: string }> }) {
  const { supabase } = await requireFullAdmin();
  const sp = await searchParams;
  const view = VIEWS.some(([v]) => v === sp.status) ? (sp.status as string) : 'all';
  const term = searchTerm(sp.q);
  const city = sp.city && UUID.test(sp.city) ? sp.city : undefined;
  const { page, size, from, to } = paging(sp.page, sp.size);

  let q = supabase.from('venues').select('id, name, area_name, address_line, status, partner, late_events_allowed, capacity, hours, cities(name)', { count: 'exact' }).order('name').range(from, to);
  if (view !== 'all') q = q.eq('status', view as 'approved' | 'draft' | 'archived');
  if (term) q = q.or(`name.ilike.%${term}%,area_name.ilike.%${term}%`);
  if (city) q = q.eq('city_id', city);
  const [{ data: venues, count, error }, { data: cities }] = await Promise.all([q, supabase.from('cities').select('id, name').order('name')]);

  return (
    <Page
      title="Venues"
      icon="venue"
      subtitle="Public places with staff on site. Plans can only be hosted at approved venues."
      actions={
        <LinkButton href="/venues/new" icon="plus" tone="primary">
          Add venue
        </LinkButton>
      }
    >
      <Tabs base="/venues" param="status" value={view} keep={{ q: term || undefined, city }} items={VIEWS} />
      <Toolbar>
        <input type="hidden" name="status" value={view} />
        <SearchInput defaultValue={term} placeholder="Search name or area" />
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
        {venues?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Venue</th>
                  <th>City / area</th>
                  <th>Hours</th>
                  <th className="num">Capacity</th>
                  <th>Status</th>
                  <th>Flags</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => {
                  const hours = (v.hours as { all?: { open?: string; close?: string } } | null)?.all;
                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="cell-main">
                          <Link href={`/venues/${v.id}`}>{v.name}</Link>
                          <span className="muted">{v.address_line}</span>
                        </div>
                      </td>
                      <td>
                        {(v.cities as { name: string } | null)?.name} · {v.area_name}
                      </td>
                      <td className="muted">{hours?.open && hours?.close ? `${hours.open}–${hours.close}` : '—'}</td>
                      <td className="num">{v.capacity}</td>
                      <td>
                        <Badge value={v.status} />
                      </td>
                      <td>
                        <div className="row">
                          {v.partner ? <span className="chip">Partner</span> : null}
                          {v.late_events_allowed ? <span className="chip">Open late</span> : null}
                        </div>
                      </td>
                      <td className="actions">
                        <LinkButton href={`/venues/${v.id}`} size="sm" icon="edit">
                          Edit
                        </LinkButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="venue">No venues match.</Empty>
        )}
      </Card>
      <Pager base="/venues" params={{ status: view === 'all' ? undefined : view, q: term || undefined, city }} page={page} total={count} size={size} />
    </Page>
  );
}
