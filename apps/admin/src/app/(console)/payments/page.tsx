import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { Brand } from '@/components/Brand';
import { Badge, Card, Empty, LoadError, Page, Pager, Stat, Tabs, Toolbar, UserLink } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { formatDateTime, formatPaise, humanize, paging } from '@/lib/format';
import { UUID } from '@/lib/validate';
import { refundPayment } from '../manage-actions';

const STATUSES = ['paid', 'created', 'refund_pending', 'refunded', 'failed', 'expired'] as const;
type Status = (typeof STATUSES)[number];

type Search = { status?: string; kind?: string; user?: string; page?: string; size?: string };

/** Razorpay payments: passes (premium) and paid plan seats. Refunds go through the payments-refunds worker. */
export default async function Payments({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase } = await requireFullAdmin();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const kind = sp.kind === 'premium' || sp.kind === 'plan' ? sp.kind : undefined;
  const user = sp.user && UUID.test(sp.user) ? sp.user : undefined;
  const { page, size, from, to } = paging(sp.page, sp.size);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  let q = supabase
    .from('payments')
    .select('id, user_id, kind, product_id, tier, days, amount_paise, platform_fee_paise, host_payout_paise, status, plan_id, razorpay_payment_id, refund_id, created_at, paid_at, plans(title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (status) q = q.eq('status', status);
  if (kind) q = q.eq('kind', kind);
  if (user) q = q.eq('user_id', user);
  const [{ data: rows, count, error }, { data: month }] = await Promise.all([
    q,
    supabase.from('payments').select('kind, status, amount_paise, platform_fee_paise').gte('created_at', monthAgo).limit(10000),
  ]);

  const paid = (month ?? []).filter((p) => p.status === 'paid');
  const gross = paid.reduce((s, p) => s + p.amount_paise, 0);
  const passes = paid.filter((p) => p.kind === 'premium').reduce((s, p) => s + p.amount_paise, 0);
  const fees = paid.filter((p) => p.kind === 'plan').reduce((s, p) => s + p.platform_fee_paise, 0);
  const refunded = (month ?? []).filter((p) => p.status === 'refunded' || p.status === 'refund_pending').reduce((s, p) => s + p.amount_paise, 0);

  const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, first_name').in('id', ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id, p.first_name]));

  return (
    <Page
      title="Payments"
      icon="card"
      subtitle={
        <span className="brandline">
          Processed by <Brand name="razorpay" size={14} label="Razorpay" /> Razorpay. Figures for the last 30 days.
        </span>
      }
    >
      <div className="stats">
        <Stat label="Collected" value={formatPaise(gross)} icon="trend" tone="success" />
        <Stat label="Passes sold" value={formatPaise(passes)} icon="star" tone="accent" />
        <Stat label="Platform fees on plans" value={formatPaise(fees)} icon="wallet" />
        <Stat label="Refunded or refunding" value={formatPaise(refunded)} icon="undo" tone="warning" />
      </div>
      <Tabs
        base="/payments"
        param="status"
        value={status ?? 'all'}
        keep={{ kind, user }}
        items={[['all', 'All'], ['paid', 'Paid'], ['refund_pending', 'Refunding'], ['refunded', 'Refunded'], ['created', 'Unpaid'], ['failed', 'Failed'], ['expired', 'Expired']]}
      />
      <Toolbar>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <select name="kind" defaultValue={kind ?? ''} aria-label="Type">
          <option value="">Passes and plan seats</option>
          <option value="premium">Passes</option>
          <option value="plan">Plan seats</option>
        </select>
        <input name="user" defaultValue={user} placeholder="Member id" aria-label="Member id" />
      </Toolbar>
      <LoadError error={error} />
      <Card flush>
        {rows?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>For</th>
                  <th className="num">Amount</th>
                  <th className="num">Our share</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Razorpay ref</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <UserLink id={p.user_id} name={name.get(p.user_id)} />
                    </td>
                    <td>
                      <div className="cell-main">
                        {p.kind === 'plan' && p.plan_id ? (
                          <Link href={`/plans/${p.plan_id}`}>{(p.plans as { title: string } | null)?.title ?? 'Plan seat'}</Link>
                        ) : (
                          <span>
                            {humanize(p.tier)} pass · {p.days} days
                          </span>
                        )}
                        <span className="muted">{p.product_id}</span>
                      </div>
                    </td>
                    <td className="num">{formatPaise(p.amount_paise)}</td>
                    <td className="num muted">{formatPaise(p.kind === 'plan' ? p.platform_fee_paise : p.amount_paise)}</td>
                    <td>
                      <Badge value={p.status} />
                    </td>
                    <td className="muted">{formatDateTime(p.created_at)}</td>
                    <td>
                      <code>{p.refund_id ?? p.razorpay_payment_id ?? '—'}</code>
                    </td>
                    <td className="actions">
                      {p.status === 'paid' && p.razorpay_payment_id ? (
                        <ActionForm
                          dialog={{ label: 'Refund', icon: 'undo', tone: 'danger', compact: true, title: `Refund ${formatPaise(p.amount_paise)}`, description: 'Sends the full amount back through Razorpay. A pass is not ended automatically; change the member’s plan if needed.' }}
                          action={refundPayment}
                          hidden={{ payment_id: p.id }}
                          confirm="Refund this payment in full?"
                          buttons={[{ label: 'Refund in full', tone: 'danger', icon: 'undo' }]}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="card">No payments match.</Empty>
        )}
      </Card>
      <Pager base="/payments" params={{ status, kind, user }} page={page} total={count} size={size} />
    </Page>
  );
}
