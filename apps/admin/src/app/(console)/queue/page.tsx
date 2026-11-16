import { Badge, Card, Due, Empty, LinkButton, LoadError, Page, Pager, Tabs, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { humanize, paging } from '@/lib/format';

const FILTERS: [string, string][] = [
  ['open', 'Open'],
  ['severe', 'Severe'],
  ['escalated', 'Escalated'],
  ['mine', 'Claimed by me'],
  ['closed', 'Decided'],
];

/** AD-1, SF-7: severe first, then by due time. */
export default async function Queue({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string; size?: string }> }) {
  const { supabase, userId } = await requireAdmin();
  const sp = await searchParams;
  const filter = sp.filter ?? 'open';
  const { page, size, from, to } = paging(sp.page, sp.size);

  let q = supabase
    .from('moderation_queue')
    .select('id, subject, severity, status, ai_verdict, ai_labels, user_id, due_at', { count: 'exact' })
    .range(from, to);
  if (filter === 'closed') q = q.in('status', ['approved', 'rejected']).order('decided_at', { ascending: false });
  else {
    q = q.order('severity').order('due_at');
    if (filter === 'escalated') q = q.eq('status', 'escalated');
    else if (filter === 'mine') q = q.eq('status', 'in_review').eq('assigned_to', userId);
    else q = q.in('status', ['pending', 'in_review', 'escalated']);
    if (filter === 'severe') q = q.eq('severity', 'severe');
  }
  const { data: items, count, error } = await q;

  return (
    <Page title="Review queue" icon="queue" subtitle="Severe items need a human decision within 12 hours, standard within 24.">
      <Tabs base="/queue" param="filter" value={filter} items={FILTERS} />
      <LoadError error={error} />
      <Card flush>
      {items?.length ? (
        <div className="tablewrap"><table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Automated check</th>
              <th>Member</th>
              <th>Due</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{humanize(i.subject)}</td>
                <td>
                  <Badge value={i.severity} />
                </td>
                <td>
                  <Badge value={i.status} />
                </td>
                <td>
                  {i.ai_verdict ? <Badge value={i.ai_verdict} /> : '—'}{' '}
                  <span className="muted">{Array.isArray(i.ai_labels) ? (i.ai_labels as string[]).slice(0, 3).join(', ') : ''}</span>
                </td>
                <td>
                  <UserLink id={i.user_id} />
                </td>
                <td>{i.status === 'approved' || i.status === 'rejected' ? <span className="muted">done</span> : <Due at={i.due_at} />}</td>
                <td className="actions">
                  <LinkButton href={`/queue/${i.id}`} size="sm" icon="next">
                    Open
                  </LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : (
        <Empty icon="check">Nothing here. Good work.</Empty>
      )}
      </Card>
      <Pager base="/queue" params={{ filter: filter === 'open' ? undefined : filter }} page={page} total={count} size={size} />
    </Page>
  );
}
