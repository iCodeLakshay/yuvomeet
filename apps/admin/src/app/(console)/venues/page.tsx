import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge, Empty, Page } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';

/** SF-1, S-31: every plan happens at an approved venue. Admins create and approve them. */
export default async function Venues() {
  const { supabase, role } = await requireAdmin();
  if (role !== 'admin') redirect('/queue');
  const { data: venues } = await supabase.from('venues').select('id, name, area_name, status, partner, late_events_allowed, capacity, cities(name)').order('name');

  return (
    <Page
      title="Venues"
      actions={
        <Link className="btn primary" href="/venues/new">
          Add venue
        </Link>
      }
    >
      {venues?.length ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>City / area</th>
              <th>Status</th>
              <th>Capacity</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/venues/${v.id}`}>{v.name}</Link>
                </td>
                <td>
                  {(v.cities as { name: string } | null)?.name} · {v.area_name}
                </td>
                <td>
                  <Badge value={v.status} />
                </td>
                <td>{v.capacity}</td>
                <td className="row">
                  {v.partner ? <Badge value="partner" tone="accent" /> : null}
                  {v.late_events_allowed ? <Badge value="open late" /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>No venues yet.</Empty>
      )}
    </Page>
  );
}
