import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Empty, LoadError, Page, Pager, SearchInput, Tabs, Toolbar } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { formatCount, formatDate, paging, searchTerm } from '@/lib/format';
import { UUID } from '@/lib/validate';
import { deleteCollege, mergeCollege, saveCollege, setCollegeStatus } from '../manage-actions';

type Option = { id: string; name: string };

function CitySelect({ cities, value }: { cities: Option[]; value?: string }) {
  return (
    <label className="field">
      <span>City</span>
      <select name="city_id" defaultValue={value ?? cities[0]?.id} required>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Colleges members pick (or type) for same-college plans. Merge the duplicates members create. */
export default async function Colleges({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; city?: string; page?: string; size?: string }> }) {
  const { supabase } = await requireFullAdmin();
  const sp = await searchParams;
  const status = sp.status === 'hidden' || sp.status === 'all' ? sp.status : 'active';
  const term = searchTerm(sp.q);
  const city = sp.city && UUID.test(sp.city) ? sp.city : undefined;
  const { page, size, from, to } = paging(sp.page, sp.size);

  let q = supabase.from('colleges').select('id, name, status, city_id, created_at, cities(name)', { count: 'exact' }).order('name').range(from, to);
  if (status !== 'all') q = q.eq('status', status);
  if (term) q = q.ilike('name', `%${term}%`);
  if (city) q = q.eq('city_id', city);
  const [{ data: colleges, count: total, error }, { data: cities }] = await Promise.all([q, supabase.from('cities').select('id, name').order('name')]);
  const pageIds = (colleges ?? []).map((c) => c.id);
  const pageCities = [...new Set((colleges ?? []).map((c) => c.city_id))];
  const [{ data: members }, { data: all }] = pageIds.length
    ? await Promise.all([
        supabase.from('profiles').select('college_id').in('college_id', pageIds).limit(20000),
        supabase.from('colleges').select('id, name, city_id').in('city_id', pageCities).order('name').limit(2000),
      ])
    : [{ data: [] }, { data: [] }];
  const count = new Map<string, number>();
  for (const m of members ?? []) if (m.college_id) count.set(m.college_id, (count.get(m.college_id) ?? 0) + 1);

  return (
    <Page
      title="Colleges"
      icon="college"
      subtitle="Hide junk entries, merge duplicates into one, and add colleges before a campus launch."
      actions={
        cities?.length ? (
          <ActionForm dialog={{ label: 'Add college', icon: 'plus', tone: 'primary' }} action={saveCollege} buttons={[{ label: 'Add college', tone: 'primary', icon: 'plus' }]}>
            <label className="field">
              <span>Name</span>
              <input name="name" required minLength={2} maxLength={120} />
            </label>
            <CitySelect cities={cities} value={city} />
          </ActionForm>
        ) : null
      }
    >
      <Tabs base="/colleges" param="status" value={status} keep={{ q: term || undefined, city }} items={[['active', 'Shown'], ['hidden', 'Hidden'], ['all', 'All']]} />
      <Toolbar>
        <input type="hidden" name="status" value={status} />
        <SearchInput defaultValue={term} placeholder="Search colleges" />
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
        {colleges?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>College</th>
                  <th>City</th>
                  <th className="num">Members</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {colleges.map((c) => {
                  const others = (all ?? []).filter((o) => o.city_id === c.city_id && o.id !== c.id);
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>{(c.cities as { name: string } | null)?.name}</td>
                      <td className="num">{formatCount(count.get(c.id))}</td>
                      <td>
                        <Badge value={c.status} tone={c.status === 'active' ? 'success' : 'neutral'} />
                      </td>
                      <td className="muted">{formatDate(c.created_at)}</td>
                      <td className="actions">
                        <div className="row">
                          <ActionForm dialog={{ label: '', icon: 'edit', compact: true, title: `Edit ${c.name}` }} action={saveCollege} hidden={{ college_id: c.id }} buttons={[{ label: 'Save', tone: 'primary', icon: 'save' }]}>
                            <label className="field">
                              <span>Name</span>
                              <input name="name" defaultValue={c.name} required minLength={2} maxLength={120} />
                            </label>
                            <CitySelect cities={cities ?? []} value={c.city_id} />
                          </ActionForm>
                          <ActionForm
                            dialog={{ label: '', icon: c.status === 'active' ? 'hide' : 'eye', compact: true, title: c.status === 'active' ? 'Hide college' : 'Show college', description: c.status === 'active' ? 'Members can no longer pick it. Existing members keep it.' : undefined }}
                            action={setCollegeStatus}
                            hidden={{ college_id: c.id }}
                            buttons={[c.status === 'active' ? { label: 'Hide', value: 'hidden', icon: 'hide' } : { label: 'Show', value: 'active', icon: 'eye', tone: 'primary' }]}
                          />
                          {others.length ? (
                            <ActionForm
                              dialog={{ label: '', icon: 'refresh', compact: true, title: `Merge ${c.name} into…`, description: 'Members and plans move to the college you choose, then this one is deleted.' }}
                              action={mergeCollege}
                              hidden={{ college_id: c.id }}
                              confirm="Merge these colleges? This cannot be undone."
                              buttons={[{ label: 'Merge', tone: 'primary', icon: 'refresh' }]}
                            >
                              <label className="field">
                                <span>Keep</span>
                                <select name="into_id" required>
                                  {others.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </ActionForm>
                          ) : null}
                          <ActionForm
                            dialog={{ label: '', icon: 'trash', tone: 'danger', compact: true, title: `Delete ${c.name}`, description: 'Only for colleges nobody uses. Otherwise merge or hide.' }}
                            action={deleteCollege}
                            hidden={{ college_id: c.id }}
                            buttons={[{ label: 'Delete college', tone: 'danger', icon: 'trash' }]}
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
          <Empty icon="college">No colleges match.</Empty>
        )}
      </Card>
      <Pager base="/colleges" params={{ status: status === 'active' ? undefined : status, q: term || undefined, city }} page={page} total={total} size={size} />
    </Page>
  );
}
