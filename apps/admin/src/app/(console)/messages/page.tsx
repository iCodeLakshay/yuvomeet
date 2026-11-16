import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Empty, LoadError, Page, Pager, Tabs, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatAgo, formatDateTime, paging } from '@/lib/format';
import { signMedia } from '@/lib/media';
import { removeMessage } from '../actions';
import { restoreMessage } from '../manage-actions';

const FILTERS: [string, string][] = [
  ['held', 'Held by the filter'],
  ['flagged', 'Flagged'],
  ['rejected', 'Removed'],
];

/** Chat messages that need or had a decision, across every plan and pair chat. */
export default async function Messages({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string; size?: string }> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.some(([f]) => f === sp.filter) ? (sp.filter as string) : 'held';
  const { page, size, from, to } = paging(sp.page, sp.size);

  let q = supabase
    .from('messages')
    .select('id, body, image_path, status, flagged, created_at, sender_id, conversation_id, conversations(plan_id, kind)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  q = filter === 'flagged' ? q.eq('flagged', true).eq('status', 'visible') : q.eq('status', filter as 'held' | 'rejected');
  const { data: messages, count, error } = await q;

  const ids = [...new Set((messages ?? []).map((m) => m.sender_id).filter((x): x is string => Boolean(x)))];
  const [{ data: people }, urls] = await Promise.all([
    ids.length ? supabase.from('profiles').select('id, first_name').in('id', ids) : Promise.resolve({ data: [] as { id: string; first_name: string }[] }),
    signMedia(supabase, (messages ?? []).map((m) => m.image_path)),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id, p.first_name]));

  return (
    <Page title="Chat moderation" icon="message" subtitle="Messages the filter held, members flagged, or a reviewer removed.">
      <Tabs base="/messages" param="filter" value={filter} items={FILTERS} />
      <LoadError error={error} />
      {messages?.length ? (
        <div className="stack">
          {messages.map((m) => {
            const convo = m.conversations as { plan_id: string | null; kind: string } | null;
            return (
              <Card key={m.id}>
                <div className="spread">
                  <div className="row">
                    <UserLink id={m.sender_id} name={m.sender_id ? name.get(m.sender_id) : null} />
                    <span className="muted small" title={formatDateTime(m.created_at)}>
                      {formatAgo(m.created_at)}
                    </span>
                    <Badge value={m.status} />
                    {m.flagged ? <Badge value="flagged" tone="warning" /> : null}
                    <span className="chip">{convo?.kind === 'pair' ? 'Direct chat' : 'Plan chat'}</span>
                  </div>
                  <div className="row">
                    {convo?.plan_id ? (
                      <Link className="btn sm ghost" href={`/plans/${convo.plan_id}`}>
                        Open plan
                      </Link>
                    ) : null}
                    {m.status === 'rejected' ? (
                      <ActionForm
                        dialog={{ label: 'Restore', icon: 'restore', compact: true, title: 'Restore message', description: 'The message becomes visible to the chat again.' }}
                        action={restoreMessage}
                        hidden={{ message_id: m.id, plan_id: convo?.plan_id ?? '' }}
                        buttons={[{ label: 'Restore message', icon: 'restore', tone: 'primary' }]}
                      />
                    ) : (
                      <>
                        {m.status === 'held' ? (
                          <ActionForm
                            dialog={{ label: 'Show', icon: 'eye', tone: 'success', compact: true, title: 'Show this message', description: 'The filter was wrong; the chat will see it.' }}
                            action={restoreMessage}
                            hidden={{ message_id: m.id, plan_id: convo?.plan_id ?? '' }}
                            buttons={[{ label: 'Show message', icon: 'eye', tone: 'primary' }]}
                          />
                        ) : null}
                        <ActionForm
                          dialog={{ label: 'Remove', icon: 'trash', tone: 'danger', compact: true, title: 'Remove message' }}
                          action={removeMessage}
                          hidden={{ message_id: m.id, plan_id: convo?.plan_id ?? '', item_id: '' }}
                          buttons={[{ label: 'Remove message', icon: 'trash', tone: 'danger' }]}
                        />
                      </>
                    )}
                  </div>
                </div>
                {m.body ? <p>{m.body}</p> : null}
                {m.image_path && urls.get(m.image_path) ? (
                  <div className="thumbs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls.get(m.image_path)} alt="Chat photo" />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty icon="messageOff">Nothing here.</Empty>
      )}
      <Pager base="/messages" params={{ filter }} page={page} total={count} size={size} />
    </Page>
  );
}
