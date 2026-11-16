import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Empty, LoadError, Page, Pager } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { formatCount, formatDate, paging } from '@/lib/format';
import { setCityStatus } from '../actions';
import { deleteCity, saveCity } from '../manage-actions';

const STATUSES = ['waitlist', 'beta', 'live'] as const;

type City = { id: string; name: string; slug: string; timezone: string; center_lat: number; center_lng: number } | null;

function CityFields({ city }: { city: City }) {
  return (
    <div className="formgrid">
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={city?.name} required minLength={2} maxLength={60} placeholder="Kota" />
      </label>
      <label className="field">
        <span>Slug</span>
        <input name="slug" defaultValue={city?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={40} placeholder="kota" />
        <small>Lowercase, used in analytics. Changing it splits reports.</small>
      </label>
      <label className="field">
        <span>Time zone</span>
        <input name="timezone" defaultValue={city?.timezone ?? 'Asia/Kolkata'} required />
      </label>
      <label className="field">
        <span>Centre latitude</span>
        <input name="center_lat" type="number" step="0.000001" min={-90} max={90} defaultValue={city?.center_lat} required />
      </label>
      <label className="field">
        <span>Centre longitude</span>
        <input name="center_lng" type="number" step="0.000001" min={-180} max={180} defaultValue={city?.center_lng} required />
      </label>
    </div>
  );
}

/** AD-4: cities, their launch status, and the demand waiting for them. */
export default async function Cities({ searchParams }: { searchParams: Promise<{ page?: string; size?: string }> }) {
  const { supabase } = await requireFullAdmin();
  const sp = await searchParams;
  const { page, size, from, to } = paging(sp.page, sp.size);
  const [{ data: rows, count, error }, { data: web }] = await Promise.all([
    supabase.from('admin_city_waitlist').select('id, name, slug, status, waitlist_count, launch_date', { count: 'exact' }).order('name').range(from, to),
    supabase.from('admin_web_waitlist').select('city, signups'),
  ]);
  const pageIds = (rows ?? []).map((r) => r.id).filter((x): x is string => Boolean(x));
  const [{ data: cities }, { data: venues }] = pageIds.length
    ? await Promise.all([
        supabase.from('cities').select('id, name, slug, timezone, center_lat, center_lng').in('id', pageIds),
        supabase.from('venues').select('city_id').eq('status', 'approved').in('city_id', pageIds),
      ])
    : [{ data: [] }, { data: [] }];
  const detail = new Map((cities ?? []).map((c) => [c.id, c]));
  const webCount = new Map((web ?? []).map((w) => [(w.city ?? '').toLowerCase(), w.signups ?? 0]));
  const venueCount = new Map<string, number>();
  for (const v of venues ?? []) venueCount.set(v.city_id, (venueCount.get(v.city_id) ?? 0) + 1);

  return (
    <Page
      title="Cities"
      icon="building"
      subtitle="Waitlist cities collect demand; beta and live cities open onboarding and plans."
      actions={
        <ActionForm dialog={{ label: 'Add city', icon: 'plus', tone: 'primary', description: 'New cities start on the waitlist.' }} action={saveCity} buttons={[{ label: 'Create city', tone: 'primary', icon: 'plus' }]}>
          <CityFields city={null} />
        </ActionForm>
      }
    >
      <LoadError error={error} />
      <Card flush>
        {rows?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>City</th>
                  <th>Status</th>
                  <th className="num">In-app waitlist</th>
                  <th className="num">Web waitlist</th>
                  <th className="num">Approved venues</th>
                  <th>Launched</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const d = c.id ? detail.get(c.id) : undefined;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="cell-main">
                          <strong>{c.name}</strong>
                          <span className="muted">
                            {c.slug} · {d?.timezone}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge value={c.status} />
                      </td>
                      <td className="num">{formatCount(c.waitlist_count)}</td>
                      <td className="num">{formatCount(webCount.get((c.name ?? '').toLowerCase()))}</td>
                      <td className="num">{formatCount(c.id ? venueCount.get(c.id) : 0)}</td>
                      <td className="muted">{c.launch_date ? formatDate(c.launch_date) : '—'}</td>
                      <td className="actions">
                        <div className="row">
                          <ActionForm
                            dialog={{ label: 'Status', icon: 'trend', compact: true, title: `Change ${c.name}'s status`, description: 'Members in the city see the change at once.' }}
                            action={setCityStatus}
                            hidden={{ city_id: c.id! }}
                            buttons={STATUSES.filter((s) => s !== c.status).map((s) => ({
                              label: `Set ${s}`,
                              value: s,
                              tone: s === 'live' ? ('primary' as const) : undefined,
                              icon: s === 'live' ? ('trend' as const) : s === 'beta' ? ('star' as const) : ('list' as const),
                            }))}
                          />
                          <ActionForm dialog={{ label: '', icon: 'edit', compact: true, title: `Edit ${c.name}` }} action={saveCity} hidden={{ city_id: c.id! }} buttons={[{ label: 'Save city', tone: 'primary', icon: 'save' }]}>
                            <CityFields city={d ?? null} />
                          </ActionForm>
                          <ActionForm
                            dialog={{ label: '', icon: 'trash', tone: 'danger', compact: true, title: `Delete ${c.name}`, description: 'Only possible while no members, plans, venues or colleges use the city. Its waitlist is removed too.' }}
                            action={deleteCity}
                            hidden={{ city_id: c.id! }}
                            confirm="Delete this city?"
                            buttons={[{ label: 'Delete city', tone: 'danger', icon: 'trash' }]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="building">No cities yet. Add the first one.</Empty>
        )}
      </Card>
      <Pager base="/cities" params={{}} page={page} total={count} size={size} />
    </Page>
  );
}
