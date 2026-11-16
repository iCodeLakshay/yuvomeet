import { ActionForm, type ActionFormProps } from '@/components/ActionForm';
import { Card, ClientTable, Empty, LoadError, Page } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { formatCount } from '@/lib/format';
import { deleteActivity, deleteInterest, saveActivity, saveInterest } from '../manage-actions';

type Item = { slug: string; label: string; icon: string; sort: number };

function Fields({ item }: { item?: Item }) {
  return (
    <div className="formgrid">
      <label className="field">
        <span>Label</span>
        <input name="label" defaultValue={item?.label} required minLength={2} maxLength={40} />
      </label>
      {item ? (
        <input type="hidden" name="slug" value={item.slug} />
      ) : (
        <label className="field">
          <span>Key</span>
          <input name="slug" required pattern="[a-z0-9]+(_[a-z0-9]+)*" maxLength={40} placeholder="board_games" />
          <small>Permanent. The app stores this, not the label.</small>
        </label>
      )}
      <label className="field">
        <span>Icon</span>
        <input name="icon" defaultValue={item?.icon} required maxLength={40} placeholder="🎲 or an icon name" />
      </label>
      <label className="field">
        <span>Order</span>
        <input name="sort" type="number" min={0} max={1000} defaultValue={item?.sort ?? 100} required />
        <small>Lower shows first.</small>
      </label>
    </div>
  );
}

function CatalogTable({
  title,
  icon,
  items,
  usage,
  usageLabel,
  save,
  remove,
  deleteNote,
}: {
  title: string;
  icon: 'tag' | 'calendar';
  items: Item[];
  usage?: Map<string, number>;
  usageLabel?: string;
  save: ActionFormProps['action'];
  remove: ActionFormProps['action'];
  deleteNote: string;
}) {
  const noun = title.toLowerCase().replace(/s$/, '').replace(/ie$/, 'y');
  return (
    <Card
      title={title}
      icon={icon}
      flush
      actions={
        <ActionForm dialog={{ label: `Add`, icon: 'plus', tone: 'primary', compact: true, title: `Add ${noun}` }} action={save} buttons={[{ label: 'Add', tone: 'primary', icon: 'plus' }]}>
          <Fields />
        </ActionForm>
      }
    >
      {items.length ? (
        <ClientTable
          pageSize={10}
          label={title.toLowerCase()}
          head={
            <tr>
              <th className="num">#</th>
              <th>Label</th>
              <th>Key</th>
              {usage ? <th className="num">{usageLabel}</th> : null}
              <th />
            </tr>
          }
        >
          {items.map((i) => (
              <tr key={i.slug}>
                <td className="num muted">{i.sort}</td>
                <td>
                  <span className="row">
                    <span aria-hidden="true">{i.icon}</span> {i.label}
                  </span>
                </td>
                <td>
                  <code>{i.slug}</code>
                </td>
                {usage ? <td className="num">{formatCount(usage.get(i.slug))}</td> : null}
                <td className="actions">
                  <div className="row">
                    <ActionForm dialog={{ label: '', icon: 'edit', compact: true, title: `Edit ${i.label}` }} action={save} buttons={[{ label: 'Save', tone: 'primary', icon: 'save' }]}>
                      <Fields item={i} />
                    </ActionForm>
                    <ActionForm
                      dialog={{ label: '', icon: 'trash', tone: 'danger', compact: true, title: `Delete ${i.label}`, description: deleteNote }}
                      action={remove}
                      hidden={{ slug: i.slug }}
                      buttons={[{ label: 'Delete', tone: 'danger', icon: 'trash' }]}
                    />
                  </div>
                </td>
              </tr>
          ))}
        </ClientTable>
      ) : (
        <Empty icon={icon}>Nothing yet.</Empty>
      )}
    </Card>
  );
}

/** The pick lists in the app: interests on profiles, activities on plans. */
export default async function Catalog() {
  const { supabase } = await requireFullAdmin();
  const [{ data: interests, error }, { data: activities }, { data: plans }] = await Promise.all([
    supabase.from('interests').select('slug, label, icon, sort').order('sort').order('label'),
    supabase.from('activities').select('slug, label, icon, sort').order('sort').order('label'),
    supabase.from('plans').select('activity').limit(20000),
  ]);
  const used = new Map<string, number>();
  for (const p of plans ?? []) used.set(p.activity, (used.get(p.activity) ?? 0) + 1);

  return (
    <Page title="Interests & activities" icon="tag" subtitle="What members pick on their profile, and what kind of plan they host. Changes show in the app at once.">
      <LoadError error={error} />
      <div className="grid2">
        <CatalogTable title="Interests" icon="tag" items={interests ?? []} save={saveInterest} remove={deleteInterest} deleteNote="It is also removed from every profile that lists it." />
        <CatalogTable
          title="Activities"
          icon="calendar"
          items={activities ?? []}
          usage={used}
          usageLabel="Plans"
          save={saveActivity}
          remove={deleteActivity}
          deleteNote="Only possible while no plan uses it."
        />
      </div>
    </Page>
  );
}
