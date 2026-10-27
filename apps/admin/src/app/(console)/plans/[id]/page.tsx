import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Empty, Facts, Page, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';
import { cancelPlan, muteMember, removeMember, removeMessage } from '../../actions';

/** Plan record: members, chat, and the moderation actions (cancel, remove, mute, remove message). */
export default async function PlanRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: plan } = await supabase.from('plans').select('*, venues(name, area_name)').eq('id', id).maybeSingle();
  if (!plan) notFound();
  const [{ data: members }, { data: convo }] = await Promise.all([
    supabase.from('plan_members').select('user_id, status, requested_at, checked_in_at, profiles(first_name)').eq('plan_id', id).order('requested_at'),
    supabase.from('conversations').select('id, status').eq('plan_id', id).maybeSingle(),
  ]);
  const [{ data: messages }, { data: mutes }] = convo
    ? await Promise.all([
        supabase.from('messages').select('*').eq('conversation_id', convo.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('conversation_mutes').select('user_id').eq('conversation_id', convo.id),
      ])
    : [{ data: [] }, { data: [] }];
  const muted = new Set((mutes ?? []).map((m) => m.user_id));
  const live = plan.status === 'open' || plan.status === 'full' || plan.status === 'started';
  const venue = plan.venues as { name: string; area_name: string } | null;

  return (
    <Page title={plan.title} subtitle={<code>{id}</code>}>
      <Card>
        <Facts
          items={[
            ['Status', <Badge key="s" value={plan.status} />],
            ['Host', <UserLink key="h" id={plan.host_id} />],
            ['Venue', venue ? <Link key="v" href={`/venues/${plan.venue_id}`}>{`${venue.name}, ${venue.area_name}`}</Link> : '—'],
            ['Starts', formatDateTime(plan.starts_at)],
            ['Ends', formatDateTime(plan.ends_at)],
            ['Audience', humanize(plan.audience)],
            ['Capacity', `${plan.approved_count} / ${plan.capacity}`],
            ['Cancel reason', plan.cancel_reason ?? '—'],
          ]}
        />
        {plan.description ? <p>{plan.description}</p> : null}
      </Card>

      {live ? (
        <Card title="Cancel plan">
          <ActionForm action={cancelPlan} hidden={{ plan_id: id }} confirm="Cancel this plan for everyone?" buttons={[{ label: 'Cancel plan', tone: 'danger' }]} />
        </Card>
      ) : null}

      <Card title={`Members (${members?.length ?? 0})`}>
        {members?.length ? (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Checked in</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td>
                    <UserLink id={m.user_id} name={(m.profiles as { first_name: string } | null)?.first_name} />
                    {m.user_id === plan.host_id ? <Badge value="host" tone="accent" /> : null}
                    {muted.has(m.user_id) ? <Badge value="muted" tone="warning" /> : null}
                  </td>
                  <td>
                    <Badge value={m.status} />
                  </td>
                  <td className="muted">{formatDateTime(m.requested_at)}</td>
                  <td className="muted">{formatDateTime(m.checked_in_at)}</td>
                  <td>
                    {live && m.user_id !== plan.host_id && (m.status === 'approved' || m.status === 'requested') ? (
                      <ActionForm collapsed="Remove from plan" action={removeMember} hidden={{ plan_id: id, user_id: m.user_id }} buttons={[{ label: 'Remove', tone: 'danger' }]} />
                    ) : null}
                    {convo && !muted.has(m.user_id) ? (
                      <ActionForm collapsed="Mute in chat" action={muteMember} hidden={{ plan_id: id, user_id: m.user_id, conversation_id: convo.id }} buttons={[{ label: 'Mute in chat' }]} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No members.</Empty>
        )}
      </Card>

      <Card title={`Chat ${convo ? `(${convo.status})` : ''}`}>
        {messages?.length ? (
          <div className="stack">
            {messages.map((m) => (
              <div key={m.id} className="msg">
                <div className="row">
                  <UserLink id={m.sender_id} />
                  <span className="muted">{formatDateTime(m.created_at)}</span>
                  {m.status !== 'visible' ? <Badge value={m.status} /> : null}
                  {m.flagged ? <Badge value="flagged" tone="warning" /> : null}
                </div>
                <div>{m.body ?? (m.image_path ? '[photo]' : '')}</div>
                {m.status !== 'rejected' ? (
                  <ActionForm collapsed="Remove message" action={removeMessage} hidden={{ message_id: m.id, plan_id: id, item_id: '' }} buttons={[{ label: 'Remove message', tone: 'danger' }]} />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty>No messages.</Empty>
        )}
      </Card>
    </Page>
  );
}
