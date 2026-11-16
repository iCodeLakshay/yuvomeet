import { ActionForm } from '@/components/ActionForm';
import { Brand } from '@/components/Brand';
import { Card, ClientTable, Empty, LoadError, Page, Pager, Stat, UserLink } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { formatDateTime, formatPaise, paging } from '@/lib/format';
import { recordPayout } from '../manage-actions';

type Host = { id: string; earned: number; upcoming: number; paidOut: number };

/**
 * Hosts' earnings from paid plans and the payouts sent to them. Same arithmetic as my_earnings():
 * earned = host share of paid seats on completed plans; due = earned minus what was already paid out.
 */
export default async function Payouts({ searchParams }: { searchParams: Promise<{ page?: string; size?: string }> }) {
  const { supabase } = await requireFullAdmin();
  const sp = await searchParams;
  const { page, size, from, to } = paging(sp.page, sp.size);
  const [{ data: seats, error }, { data: payouts }, { data: accounts }] = await Promise.all([
    supabase.from('payments').select('host_id, host_payout_paise, plans(status)').eq('kind', 'plan').eq('status', 'paid').limit(20000),
    supabase.from('host_payouts').select('id, host_id, amount_paise, reference, paid_by, created_at').order('created_at', { ascending: false }).limit(5000),
    supabase.from('payout_accounts').select('user_id, upi_id, holder_name'),
  ]);

  const hosts = new Map<string, Host>();
  const host = (id: string) => hosts.get(id) ?? hosts.set(id, { id, earned: 0, upcoming: 0, paidOut: 0 }).get(id)!;
  for (const s of seats ?? []) {
    if (!s.host_id) continue;
    if ((s.plans as { status: string } | null)?.status === 'completed') host(s.host_id).earned += s.host_payout_paise;
    else host(s.host_id).upcoming += s.host_payout_paise;
  }
  for (const p of payouts ?? []) host(p.host_id).paidOut += p.amount_paise;
  const list = [...hosts.values()].map((h) => ({ ...h, due: h.earned - h.paidOut })).sort((a, b) => b.due - a.due);
  const account = new Map((accounts ?? []).map((a) => [a.user_id, a]));
  const pageList = list.slice(from, to + 1);
  const ids = [...new Set([...pageList.map((h) => h.id), ...(payouts ?? []).map((p) => p.host_id)])];
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, first_name').in('id', ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id, p.first_name]));
  const totalDue = list.reduce((s, h) => s + Math.max(0, h.due), 0);

  return (
    <Page
      title="Host payouts"
      icon="wallet"
      subtitle={
        <span className="brandline">
          Send the money by <Brand name="upi" size={14} label="UPI" /> UPI first, then record it here with the transfer reference.
        </span>
      }
    >
      <div className="stats">
        <Stat label="Due to hosts now" value={formatPaise(totalDue)} icon="wallet" tone={totalDue > 0 ? 'warning' : 'success'} />
        <Stat label="Held for upcoming plans" value={formatPaise(list.reduce((s, h) => s + h.upcoming, 0))} icon="calendar" />
        <Stat label="Paid out so far" value={formatPaise(list.reduce((s, h) => s + h.paidOut, 0))} icon="check" tone="success" />
      </div>
      <LoadError error={error} />
      <Card title="Balances" icon="users" flush>
        {list.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Host</th>
                  <th>UPI account</th>
                  <th className="num">Earned</th>
                  <th className="num">Upcoming</th>
                  <th className="num">Paid out</th>
                  <th className="num">Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageList.map((h) => {
                  const a = account.get(h.id);
                  return (
                    <tr key={h.id}>
                      <td>
                        <UserLink id={h.id} name={name.get(h.id)} />
                      </td>
                      <td>{a ? <code>{a.upi_id}</code> : <span className="muted">Not added</span>}</td>
                      <td className="num">{formatPaise(h.earned)}</td>
                      <td className="num muted">{formatPaise(h.upcoming)}</td>
                      <td className="num">{formatPaise(h.paidOut)}</td>
                      <td className={`num${h.due > 0 ? ' ok' : ''}`}>{formatPaise(h.due)}</td>
                      <td className="actions">
                        {h.due > 0 ? (
                          <ActionForm
                            dialog={{ label: 'Record payout', icon: 'send', tone: 'primary', compact: true, title: `Record a payout to ${name.get(h.id) || 'host'}`, description: a ? `UPI: ${a.upi_id} (${a.holder_name})` : 'The host has not added a UPI account yet.' }}
                            action={recordPayout}
                            hidden={{ host_id: h.id }}
                            buttons={[{ label: 'Record payout', tone: 'primary', icon: 'check' }]}
                          >
                            <div className="formgrid">
                              <label className="field">
                                <span>Amount (₹)</span>
                                <input name="amount" type="number" step="0.01" min="0.01" defaultValue={(h.due / 100).toFixed(2)} required />
                              </label>
                              <label className="field">
                                <span>UPI reference (UTR)</span>
                                <input name="reference" required minLength={4} maxLength={80} />
                              </label>
                            </div>
                          </ActionForm>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="wallet">No host has earned from a paid plan yet.</Empty>
        )}
        <Pager base="/payouts" params={{}} page={page} total={list.length} size={size} />
      </Card>
      <Card title="Payout history" icon="history" flush>
        {payouts?.length ? (
          <ClientTable
            pageSize={10}
            label="payouts"
            head={
              <tr>
                <th>Host</th>
                <th className="num">Amount</th>
                <th>Reference</th>
                <th>Recorded by</th>
                <th>When</th>
              </tr>
            }
          >
            {payouts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <UserLink id={p.host_id} name={name.get(p.host_id)} />
                  </td>
                  <td className="num">{formatPaise(p.amount_paise)}</td>
                  <td>
                    <code>{p.reference ?? '—'}</code>
                  </td>
                  <td>
                    <UserLink id={p.paid_by} />
                  </td>
                  <td className="muted">{formatDateTime(p.created_at)}</td>
                </tr>
            ))}
          </ClientTable>
        ) : (
          <Empty icon="history">No payouts recorded.</Empty>
        )}
      </Card>
    </Page>
  );
}
