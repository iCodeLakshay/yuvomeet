import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, ClientTable, Empty, Facts, Page, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, formatPaise, humanize } from '@/lib/format';
import { signMedia } from '@/lib/media';
import { cancelPlan, muteMember, removeMember, removeMessage } from '../../actions';
import { restoreMessage, setConversationStatus, unmuteMember, updatePlan } from '../../manage-actions';

/** Plan record: details, members, chat, and every moderation action on them. */
export default async function PlanRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: plan } = await supabase.from('plans').select('id, title, description, status, host_id, venue_id, activity, starts_at, ends_at, audience, approved_count, capacity, requires_approval, price_paise, late_cancel, cancel_reason, cover_id, venues(name, area_name), cities(name), colleges(name)').eq('id', id).maybeSingle();
  if (!plan) notFound();
  const [{ data: members }, { data: convo }, { data: payments }, { data: cover }] = await Promise.all([
    supabase.from('plan_members').select('user_id, status, requested_at, checked_in_at, paid_at, note, profiles(first_name)').eq('plan_id', id).order('requested_at'),
    supabase.from('conversations').select('id, status, closes_at').eq('plan_id', id).maybeSingle(),
    supabase.from('payments').select('id, user_id, amount_paise, status').eq('plan_id', id).order('created_at', { ascending: false }),
    plan.cover_id ? supabase.from('plan_covers').select('path').eq('id', plan.cover_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const [{ data: messages }, { data: mutes }] = convo
    ? await Promise.all([
        supabase.from('messages').select('id, sender_id, created_at, status, flagged, body, image_path').eq('conversation_id', convo.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('conversation_mutes').select('user_id, reason').eq('conversation_id', convo.id),
      ])
    : [{ data: [] }, { data: [] }];
  const muted = new Map((mutes ?? []).map((m) => [m.user_id, m.reason]));
  const memberName = new Map((members ?? []).map((m) => [m.user_id, (m.profiles as { first_name: string } | null)?.first_name]));
  const urls = await signMedia(supabase, [cover?.path, ...(messages ?? []).map((m) => m.image_path)]);
  const live = plan.status === 'open' || plan.status === 'full' || plan.status === 'started';
  const venue = plan.venues as { name: string; area_name: string } | null;
  const paidTotal = (payments ?? []).filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount_paise, 0);

  return (
    <Page
      title={plan.title}
      icon="calendar"
      crumbs={[{ href: '/plans', label: 'Plans' }]}
      subtitle={<code>{id}</code>}
      actions={
        <>
          <ActionForm
            dialog={{ label: 'Edit', icon: 'edit', title: 'Edit plan', description: 'Fix a title or description that breaks the rules. The host sees the change.' }}
            action={updatePlan}
            hidden={{ plan_id: id }}
            buttons={[{ label: 'Save plan', tone: 'primary', icon: 'save' }]}
          >
            <label className="field">
              <span>Title</span>
              <input name="title" defaultValue={plan.title} required minLength={3} maxLength={60} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea name="description" defaultValue={plan.description ?? ''} maxLength={500} rows={4} />
            </label>
          </ActionForm>
          {live ? (
            <ActionForm
              dialog={{ label: 'Cancel plan', icon: 'ban', tone: 'danger', description: 'Everyone is told, paid seats are refunded, and the plan cannot be restored.' }}
              action={cancelPlan}
              hidden={{ plan_id: id }}
              confirm="Cancel this plan for everyone?"
              buttons={[{ label: 'Cancel plan', tone: 'danger', icon: 'ban' }]}
            />
          ) : null}
        </>
      }
    >
      <Card>
        <Facts
          items={[
            ['Status', <Badge key="s" value={plan.status} />],
            ['Host', <UserLink key="h" id={plan.host_id} name={plan.host_id ? memberName.get(plan.host_id) : null} />],
            ['Venue', venue ? <Link key="v" href={`/venues/${plan.venue_id}`}>{`${venue.name}, ${venue.area_name}`}</Link> : '—'],
            ['City', (plan.cities as { name: string } | null)?.name ?? '—'],
            ['Activity', humanize(plan.activity)],
            ['Starts', formatDateTime(plan.starts_at)],
            ['Ends', formatDateTime(plan.ends_at)],
            ['Audience', `${humanize(plan.audience)}${plan.colleges ? ` · ${(plan.colleges as { name: string }).name}` : ''}`],
            ['Seats', `${plan.approved_count} / ${plan.capacity}`],
            ['Join approval', plan.requires_approval ? 'Host approves' : 'Instant'],
            ['Price', plan.price_paise ? formatPaise(plan.price_paise) : 'Free'],
            ['Collected', paidTotal ? formatPaise(paidTotal) : '—'],
            ['Late cancel', plan.late_cancel ? 'Yes' : 'No'],
            ['Cancel reason', plan.cancel_reason ?? '—'],
          ]}
        />
        {plan.description ? <p>{plan.description}</p> : <p className="muted">No description.</p>}
        {cover?.path && urls.get(cover.path) ? (
          <div className="thumbs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls.get(cover.path)} alt="Plan banner" style={{ width: 320, height: 160 }} />
          </div>
        ) : null}
      </Card>

      <Card title={`Members (${members?.length ?? 0})`} icon="users" flush>
        {members?.length ? (
          <ClientTable
            pageSize={10}
            label="members"
            head={
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Checked in</th>
                <th>Paid</th>
                <th />
              </tr>
            }
          >
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td>
                      <div className="row">
                        <UserLink id={m.user_id} name={memberName.get(m.user_id)} />
                        {m.user_id === plan.host_id ? <Badge value="host" tone="accent" /> : null}
                        {muted.has(m.user_id) ? <Badge value="muted" tone="warning" /> : null}
                      </div>
                      {m.note ? <span className="muted small">“{m.note}”</span> : null}
                    </td>
                    <td>
                      <Badge value={m.status} />
                    </td>
                    <td className="muted">{formatDateTime(m.requested_at)}</td>
                    <td className="muted">{formatDateTime(m.checked_in_at)}</td>
                    <td className="muted">{m.paid_at ? formatDateTime(m.paid_at) : '—'}</td>
                    <td className="actions">
                      <div className="row">
                        {convo ? (
                          muted.has(m.user_id) ? (
                            <ActionForm
                              dialog={{ label: 'Unmute', icon: 'message', compact: true, title: 'Unmute in chat', description: `Muted for: ${muted.get(m.user_id)}` }}
                              action={unmuteMember}
                              hidden={{ plan_id: id, user_id: m.user_id, conversation_id: convo.id }}
                              buttons={[{ label: 'Unmute', icon: 'message', tone: 'primary' }]}
                            />
                          ) : (
                            <ActionForm
                              dialog={{ label: 'Mute', icon: 'mute', compact: true, title: 'Mute in chat', description: 'They can read the chat but cannot send messages.' }}
                              action={muteMember}
                              hidden={{ plan_id: id, user_id: m.user_id, conversation_id: convo.id }}
                              buttons={[{ label: 'Mute', icon: 'mute' }]}
                            />
                          )
                        ) : null}
                        {live && m.user_id !== plan.host_id && (m.status === 'approved' || m.status === 'requested') ? (
                          <ActionForm
                            dialog={{ label: 'Remove', icon: 'userMinus', tone: 'danger', compact: true, title: 'Remove from plan', description: 'A paid seat is refunded automatically.' }}
                            action={removeMember}
                            hidden={{ plan_id: id, user_id: m.user_id }}
                            buttons={[{ label: 'Remove member', tone: 'danger', icon: 'userMinus' }]}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
          </ClientTable>
        ) : (
          <Empty icon="users">No members.</Empty>
        )}
      </Card>

      <Card
        title={`Chat${convo ? ` · ${convo.status}` : ''}`}
        icon="message"
        actions={
          convo ? (
            convo.status === 'open' ? (
              <ActionForm
                dialog={{ label: 'Close chat', icon: 'messageOff', compact: true, description: 'Nobody can send new messages. Existing messages stay.' }}
                action={setConversationStatus}
                hidden={{ plan_id: id, conversation_id: convo.id }}
                buttons={[{ label: 'Close chat', value: 'closed', icon: 'messageOff', tone: 'danger' }]}
              />
            ) : (
              <ActionForm
                dialog={{ label: 'Reopen chat', icon: 'message', compact: true, description: 'The chat opens again for 24 hours.' }}
                action={setConversationStatus}
                hidden={{ plan_id: id, conversation_id: convo.id }}
                buttons={[{ label: 'Reopen chat', value: 'open', icon: 'message', tone: 'primary' }]}
              />
            )
          ) : null
        }
      >
        {convo ? <p className="muted small">Closes {formatDateTime(convo.closes_at)}. Newest first.</p> : null}
        {messages?.length ? (
          <div className="stack">
            {messages.map((m) => (
              <div key={m.id} className="msg">
                <div className="spread">
                  <div className="row">
                    <UserLink id={m.sender_id} name={m.sender_id ? memberName.get(m.sender_id) : null} />
                    <span className="muted small">{formatDateTime(m.created_at)}</span>
                    {m.status !== 'visible' ? <Badge value={m.status} /> : null}
                    {m.flagged ? <Badge value="flagged" tone="warning" /> : null}
                  </div>
                  {m.status === 'visible' ? (
                    <ActionForm
                      dialog={{ label: '', icon: 'trash', tone: 'danger', compact: true, title: 'Remove message' }}
                      action={removeMessage}
                      hidden={{ message_id: m.id, plan_id: id, item_id: '' }}
                      buttons={[{ label: 'Remove message', tone: 'danger', icon: 'trash' }]}
                    />
                  ) : (
                    <ActionForm
                      dialog={{ label: '', icon: 'restore', compact: true, title: 'Restore message' }}
                      action={restoreMessage}
                      hidden={{ message_id: m.id, plan_id: id }}
                      buttons={[{ label: 'Restore message', tone: 'primary', icon: 'restore' }]}
                    />
                  )}
                </div>
                {m.body ? <div>{m.body}</div> : null}
                {m.image_path && urls.get(m.image_path) ? (
                  <div className="thumbs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls.get(m.image_path)} alt="Chat photo" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty icon="message">No messages.</Empty>
        )}
      </Card>
    </Page>
  );
}
