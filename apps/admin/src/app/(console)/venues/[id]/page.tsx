import { KOTA_AREAS } from '@yuvomeet/shared';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Page } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { saveVenue, setVenueStatus } from '../../actions';
import { deleteVenue } from '../../manage-actions';

type Hours = { all?: { open?: string; close?: string } };

const CHECKLIST = [
  'Commercial or public place with staff on site',
  'Busy and visible at the planned hours; no homes, flats or hostels',
  'Address and map pin checked in person or with the owner',
];

/** Venue form (create when id = "new") and status actions. */
export default async function VenueForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireFullAdmin();
  const isNew = id === 'new';
  const [{ data: venue }, { data: cities }] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from('venues').select('*').eq('id', id).maybeSingle(),
    supabase.from('cities').select('id, name').order('name'),
  ]);
  if (!isNew && !venue) notFound();
  const hours = (venue?.hours as Hours | null)?.all;

  return (
    <Page
      title={venue?.name ?? 'New venue'}
      icon="venue"
      crumbs={[{ href: '/venues', label: 'Venues' }]}
      subtitle={venue ? <Badge value={venue.status} /> : 'Starts as a draft until you approve it.'}
      actions={
        venue ? (
          <ActionForm
            dialog={{ label: 'Delete', icon: 'trash', tone: 'danger', title: 'Delete venue', description: 'Only for venues no plan ever used. Otherwise archive it.' }}
            action={deleteVenue}
            hidden={{ venue_id: venue.id }}
            confirm="Delete this venue permanently?"
            buttons={[{ label: 'Delete venue', tone: 'danger', icon: 'trash' }]}
          />
        ) : null
      }
    >
      <Card title="Checklist (SF-1)" icon="list">
        <ul>
          {CHECKLIST.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>
      <Card title="Details" icon="pin">
        <ActionForm action={saveVenue} hidden={{ venue_id: venue?.id ?? '' }} buttons={[{ label: isNew ? 'Create venue' : 'Save changes', tone: 'primary', icon: isNew ? 'plus' : 'save' }]}>
          <div className="formgrid">
            <label className="field">
              <span>Name</span>
              <input name="name" defaultValue={venue?.name} required maxLength={80} />
            </label>
            <label className="field">
              <span>City</span>
              <select name="city_id" defaultValue={venue?.city_id ?? cities?.[0]?.id}>
                {(cities ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Area</span>
              <input name="area_name" defaultValue={venue?.area_name} list="areas" required />
              <datalist id="areas">
                {KOTA_AREAS.map((a) => (
                  <option key={a.name} value={a.name} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Area cell (H3 res 8)</span>
              <input name="area_cell" defaultValue={venue?.area_cell} required pattern="[0-9a-f]{15}" />
            </label>
            <label className="field">
              <span>Address line</span>
              <input name="address_line" defaultValue={venue?.address_line} required />
            </label>
            <label className="field">
              <span>Capacity</span>
              <input name="capacity" type="number" min={3} max={200} defaultValue={venue?.capacity ?? 20} required />
            </label>
            <label className="field">
              <span>Latitude</span>
              <input name="lat" type="number" step="0.000001" defaultValue={venue?.lat} required />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input name="lng" type="number" step="0.000001" defaultValue={venue?.lng} required />
            </label>
            <label className="field">
              <span>Opens</span>
              <input name="open" type="time" defaultValue={hours?.open ?? '09:00'} required />
            </label>
            <label className="field">
              <span>Closes</span>
              <input name="close" type="time" defaultValue={hours?.close ?? '21:00'} required />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="partner" defaultChecked={venue?.partner} /> Partner venue (staff know groups are coming)
          </label>
          <label className="check">
            <input type="checkbox" name="late_events_allowed" defaultChecked={venue?.late_events_allowed} /> Allow plans after 9 PM (S-32 override)
          </label>
        </ActionForm>
      </Card>
      {venue ? (
        <Card title="Status" icon="check">
          <ActionForm
            action={setVenueStatus}
            hidden={{ venue_id: venue.id }}
            confirm="Change this venue's status? Plans can only be hosted at approved venues."
            buttons={[
              ...(venue.status !== 'approved' ? [{ label: 'Approve', value: 'approved', tone: 'success' as const, icon: 'check' as const }] : []),
              ...(venue.status !== 'archived' ? [{ label: 'Archive', value: 'archived', tone: 'danger' as const, icon: 'archive' as const }] : []),
              ...(venue.status !== 'draft' ? [{ label: 'Back to draft', value: 'draft', icon: 'undo' as const }] : []),
            ]}
          />
        </Card>
      ) : null}
    </Page>
  );
}
