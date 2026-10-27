import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Due, Empty, Facts, Page, Tabs, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';
import { decideAppeal } from '../actions';

/** VR-6: a person answers every appeal within 48 hours; the member sees the response in-app. */
export default async function Appeals({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, role } = await requireAdmin();
  const status = (await searchParams).status ?? 'open';
  let q = supabase.from('appeals').select('*').limit(100);
  q = status === 'open' ? q.eq('status', 'open').order('due_at') : q.neq('status', 'open').order('decided_at', { ascending: false });
  const { data: appeals, error } = await q;

  return (
    <Page title="Appeals" subtitle="Upholding reverses the decision; your response is shown to the member.">
      <Tabs base="/appeals" param="status" value={status} items={[['open', 'Open'], ['decided', 'Answered']]} />
      {error ? <p className="error">{error.message}</p> : null}
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
            <p>{a.message}</p>
            {a.response ? <p className="muted">Response: {a.response}</p> : null}
            {a.status === 'open' ? (
              <ActionForm
                action={decideAppeal}
                hidden={{ appeal_id: a.id }}
                reason="Response to the member (shown in the app)"
                buttons={[
                  ...(a.subject !== 'ban' || role === 'admin' ? [{ label: 'Uphold appeal', value: 'uphold', tone: 'primary' as const }] : []),
                  { label: 'Keep decision', value: 'deny' },
                ]}
              />
            ) : null}
          </Card>
        ))
      ) : (
        <Empty>No appeals here.</Empty>
      )}
    </Page>
  );
}
