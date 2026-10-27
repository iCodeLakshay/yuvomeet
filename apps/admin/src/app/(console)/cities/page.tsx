import { redirect } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { Badge, Empty, Page } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { setCityStatus } from '../actions';

const STATUSES = ['waitlist', 'beta', 'live'] as const;

/** AD-4: city launch status and waitlist demand. */
export default async function Cities() {
  const { supabase, role } = await requireAdmin();
  if (role !== 'admin') redirect('/queue');
  const { data: cities } = await supabase.from('admin_city_waitlist').select('*').order('name');

  return (
    <Page title="Cities" subtitle="Going live opens onboarding and plans for that city.">
      {cities?.length ? (
        <table>
          <thead>
            <tr>
              <th>City</th>
              <th>Status</th>
              <th>Waitlist</th>
              <th>Launched</th>
              <th>Change status</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <Badge value={c.status} />
                </td>
                <td>{c.waitlist_count ?? 0}</td>
                <td className="muted">{c.launch_date ? formatDateTime(c.launch_date) : '—'}</td>
                <td>
                  <ActionForm
                    collapsed="Change"
                    action={setCityStatus}
                    hidden={{ city_id: c.id! }}
                    buttons={STATUSES.filter((s) => s !== c.status).map((s) => ({ label: `Set ${s}`, value: s, tone: s === 'live' ? ('primary' as const) : undefined }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>No cities.</Empty>
      )}
    </Page>
  );
}
