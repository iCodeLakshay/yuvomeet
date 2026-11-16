import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Due, Empty, Facts, LoadError, Page, Pager, Tabs, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, humanize, paging } from '@/lib/format';
import { decideAppeal } from '../actions';

/** VR-6: a person answers every appeal within 48 hours; the member sees the response in-app. */
export default async function Appeals({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; size?: string }> }) {
  const { supabase, role } = await requireAdmin();
  const sp = await searchParams;
  const status = sp.status ?? 'open';
  const { page, size, from, to } = paging(sp.page, sp.size);
  let q = supabase
    .from('appeals')
    .select('id, subject, user_id, status, created_at, due_at, decided_at, message, response', { count: 'exact' })
    .range(from, to);
  q = status === 'open' ? q.eq('status', 'open').order('due_at') : q.neq('status', 'open').order('decided_at', { ascending: false });
  const { data: appeals, count, error } = await q;

  return (
    <Page title="Appeals" icon="appeal" subtitle="Upholding reverses the decision; your response is shown to the member.">
      <Tabs base="/appeals" param="status" value={status} items={[['open', 'Open'], ['decided', 'Answered']]} />
      <LoadError error={error} />
      {appeals?.length ? (
        appeals.map((a) => (
          <Card key={a.id}>
            <Facts
              items={[
                ['Subject', humanize(a.subject)],
                ['Member', <UserLink key="u" id={a.user_id} />],
                ['Status', <Badge key="s" value={a.status} />],
                ['Sent', formatDateTime(a.created_at)],
                ['Due', a.status === 'open' ? <Due key="d" at={a.due_at} /> : formatDateTime(a.decided_at)],
              ]}
            />
            <p className="msg">{a.message}</p>
            {a.response ? <p className="muted">Response: {a.response}</p> : null}
            {a.status === 'open' ? (
              <ActionForm
                action={decideAppeal}
                hidden={{ appeal_id: a.id }}
                reason="Response to the member (shown in the app)"
                confirm="Send this answer to the member? It cannot be edited afterwards."
                buttons={[
                  ...(a.subject !== 'ban' || role === 'admin' ? [{ label: 'Uphold appeal', value: 'uphold', tone: 'success' as const, icon: 'check' as const }] : []),
                  { label: 'Keep decision', value: 'deny', icon: 'close' as const },
                ]}
              />
            ) : null}
          </Card>
        ))
      ) : (
        <Empty icon="appeal">No appeals here.</Empty>
      )}
      <Pager base="/appeals" params={{ status: status === 'open' ? undefined : status }} page={page} total={count} size={size} />
    </Page>
  );
}
