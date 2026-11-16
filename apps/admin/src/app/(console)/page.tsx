import Link from 'next/link';
import { BarChart, Donut } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { Badge, Card, Due, Empty, LinkButton, Meter, Page, Stat, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatAgo, formatCount, formatPaise, humanize } from '@/lib/format';

const head = { count: 'exact', head: true } as const;
const OPEN = ['pending', 'in_review', 'escalated'] as const;
const TZ = 'Asia/Kolkata';
const DAYS = 14;

const dayKey = (ts: string | Date) => new Date(ts).toLocaleDateString('en-CA', { timeZone: TZ });

/** The last DAYS calendar days in IST, oldest first, as keys plus short labels. */
function lastDays() {
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(Date.now() - (DAYS - 1 - i) * 86_400_000);
    return { key: dayKey(d), label: d.toLocaleDateString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' }) };
  });
}

/** Counts (or sums) rows per day. Only the timestamp column is fetched, so this stays cheap. */
function perDay<T>(rows: T[] | null | undefined, keys: string[], at: (r: T) => string | null, amount: (r: T) => number = () => 1) {
  const idx = new Map(keys.map((k, i) => [k, i]));
  const out = keys.map(() => 0);
  for (const r of rows ?? []) {
    const ts = at(r);
    const i = ts ? idx.get(dayKey(ts)) : undefined;
    if (i !== undefined) out[i] = (out[i] ?? 0) + amount(r);
  }
  return out;
}

/** Week-on-week change of the last 14 daily values, in whole percent (null when last week was empty). */
function weekDelta(values: number[]) {
  const prev = values.slice(0, 7).reduce((a, b) => a + b, 0);
  const cur = values.slice(7).reduce((a, b) => a + b, 0);
  return prev ? Math.round(((cur - prev) / prev) * 100) : null;
}

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** The first screen: what needs a person now, and how the community is doing. */
export default async function Dashboard() {
  const { supabase, role, userId } = await requireAdmin();
  const full = role === 'admin';
  const now = new Date().toISOString();
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const days = lastDays();
  const keys = days.map((d) => d.key);

  const [me, openQueue, overdue, appeals, reports, active, upcoming, urgent, recent, signups, newPlans, queueIn, openWork, verified, inReview, unverified, refused, revenue, refunds] =
    await Promise.all([
      supabase.from('profiles').select('first_name').eq('id', userId).maybeSingle(),
      supabase.from('moderation_queue').select('id', head).in('status', OPEN),
      supabase.from('moderation_queue').select('id', head).in('status', OPEN).lt('due_at', now),
      supabase.from('appeals').select('id', head).eq('status', 'open'),
      supabase.from('reports').select('id', head).eq('status', 'open'),
      supabase.from('profiles').select('id', head).eq('status', 'active'),
      supabase.from('plans').select('id', head).in('status', ['open', 'full']).gte('starts_at', now),
      supabase.from('moderation_queue').select('id, subject, severity, status, due_at').in('status', OPEN).order('severity').order('due_at').limit(6),
      supabase.from('audit_log').select('id, action, admin_id, subject_type, created_at').order('id', { ascending: false }).limit(7),
      supabase.from('profiles').select('created_at').gte('created_at', since).limit(10_000),
      supabase.from('plans').select('created_at').gte('created_at', since).limit(10_000),
      supabase.from('moderation_queue').select('created_at').gte('created_at', since).limit(10_000),
      supabase.from('moderation_queue').select('subject').in('status', OPEN).limit(10_000),
      supabase.from('profiles').select('id', head).eq('verification_status', 'verified'),
      supabase.from('profiles').select('id', head).in('verification_status', ['pending', 'manual_review']),
      supabase.from('profiles').select('id', head).eq('verification_status', 'unverified'),
      supabase.from('profiles').select('id', head).in('verification_status', ['rejected', 'blocked_minor']),
      full
        ? supabase.from('payments').select('amount_paise, platform_fee_paise, kind, paid_at').eq('status', 'paid').gte('paid_at', monthAgo).limit(10_000)
        : Promise.resolve({ data: null }),
      full ? supabase.from('payments').select('id', head).eq('status', 'refund_pending') : Promise.resolve({ count: null }),
    ]);

  const joins = perDay(signups.data, keys, (r) => r.created_at);
  const plansMade = perDay(newPlans.data, keys, (r) => r.created_at);
  const arrivals = perDay(queueIn.data, keys, (r) => r.created_at);
  const paid = revenue.data ?? [];
  const gross = paid.reduce((s, p) => s + (p.amount_paise ?? 0), 0);
  const kept = (p: (typeof paid)[number]) => (p.kind === 'premium' ? (p.amount_paise ?? 0) : (p.platform_fee_paise ?? 0));
  const earned = paid.reduce((s, p) => s + kept(p), 0);
  const revenueDaily = perDay(paid, keys, (r) => r.paid_at, (r) => Math.round((r.amount_paise ?? 0) / 100));

  // Open work by type, largest first; past five types the rest fold into "Other".
  const bySubject = new Map<string, number>();
  for (const r of openWork.data ?? []) bySubject.set(r.subject, (bySubject.get(r.subject) ?? 0) + 1);
  const sorted = [...bySubject.entries()].sort((a, b) => b[1] - a[1]);
  const slices = sorted.slice(0, 5).map(([k, v]) => ({ label: humanize(k), value: v }));
  const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
  if (rest) slices.push({ label: 'Other', value: rest });

  const vTotal = (verified.count ?? 0) + (inReview.count ?? 0) + (unverified.count ?? 0) + (refused.count ?? 0);
  const name = me.data?.first_name;

  return (
    <Page
      title={`${greeting()}${name ? `, ${name}` : ''}`}
      subtitle={
        <span className="notice">
          <Icon name="clock" size={14} /> Live numbers for the community · updated {new Date().toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })}
        </span>
      }
      actions={
        <>
          {full ? (
            <LinkButton href="/announcements" icon="bell">
              Announce
            </LinkButton>
          ) : null}
          <LinkButton href="/queue" icon="queue" tone="primary">
            Open queue
          </LinkButton>
        </>
      }
    >
      <div className="stats">
        <Stat
          featured
          label="Waiting for review"
          value={formatCount(openQueue.count)}
          icon="queue"
          href="/queue"
          tone={(overdue.count ?? 0) > 0 ? 'danger' : 'accent'}
          trend={arrivals}
          hint={(overdue.count ?? 0) > 0 ? <span className="error">{overdue.count} past their deadline</span> : 'All within the review window'}
        />
        <Stat label="Active members" value={formatCount(active.count)} icon="users" href="/users?status=active" tone="success" trend={joins} delta={weekDelta(joins)} />
        <Stat label="Upcoming plans" value={formatCount(upcoming.count)} icon="calendar" href="/plans?status=upcoming" tone="accent" trend={plansMade} delta={weekDelta(plansMade)} />
        {full ? (
          <Stat label="Paid in 30 days" value={formatPaise(gross)} icon="wallet" href="/payments" tone="success" trend={revenueDaily} hint={`${formatPaise(earned)} kept after host shares`} />
        ) : (
          <Stat label="Open reports" value={formatCount(reports.count)} icon="flag" href="/reports" tone="warning" />
        )}
      </div>

      <div className="dash-grid">
        <Card title="Community activity" icon="chart" actions={<span className="chip">Last {DAYS} days</span>}>
          <BarChart
            labels={days.map((d) => d.label)}
            series={[
              { name: 'New members', values: joins },
              { name: 'Plans created', values: plansMade },
            ]}
          />
        </Card>
        <Card title="Open work by type" icon="queue" actions={<LinkButton href="/queue" size="sm" icon="next">Queue</LinkButton>}>
          {slices.length ? <Donut items={slices} total={openQueue.count ?? undefined} caption="open items" /> : <Empty icon="check">Nothing waiting. Good work.</Empty>}
        </Card>
      </div>

      <div className="dash-grid three">
        <Card title="Needs attention" icon="shieldAlert" actions={<LinkButton href="/queue" size="sm" icon="next">All</LinkButton>} flush>
          {urgent.data?.length ? (
            <ul className="list">
              {urgent.data.map((i) => (
                <li key={i.id}>
                  <Link href={`/queue/${i.id}`} className="list-row">
                    <span className="list-main">
                      <strong>{humanize(i.subject)}</strong>
                      <span className="muted small row">
                        <Badge value={i.severity} /> <Badge value={i.status} />
                      </span>
                    </span>
                    <Due at={i.due_at} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="check">Nothing waiting. Good work.</Empty>
          )}
        </Card>

        <Card title="Verification" icon="verify">
          <div className="stack">
            <Meter label="Verified" value={verified.count ?? 0} total={vTotal} tone="success" />
            <Meter label="Being checked" value={inReview.count ?? 0} total={vTotal} tone="warning" />
            <Meter label="Not started" value={unverified.count ?? 0} total={vTotal} tone="neutral" />
            <Meter label="Refused" value={refused.count ?? 0} total={vTotal} tone="danger" />
          </div>
          <div className="mini-stats">
            <Link href="/reports" className="mini-stat">
              <span className="muted small">Open reports</span>
              <strong>{formatCount(reports.count)}</strong>
            </Link>
            <Link href="/appeals" className="mini-stat">
              <span className="muted small">Open appeals</span>
              <strong>{formatCount(appeals.count)}</strong>
            </Link>
            {full ? (
              <Link href="/payments?status=refund_pending" className="mini-stat">
                <span className="muted small">Refunds pending</span>
                <strong>{formatCount(refunds.count)}</strong>
              </Link>
            ) : null}
          </div>
        </Card>

        <Card title="Recent admin activity" icon="activity" actions={<LinkButton href="/audit" size="sm" icon="next">Audit log</LinkButton>} flush>
          {recent.data?.length ? (
            <ul className="list timeline">
              {recent.data.map((a) => (
                <li key={a.id} className="list-row">
                  <span className="list-main">
                    <strong>{humanize(a.action)}</strong>
                    <span className="muted small">
                      by <UserLink id={a.admin_id} /> · {humanize(a.subject_type)}
                    </span>
                  </span>
                  <span className="muted small">{formatAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="history">No admin actions yet.</Empty>
          )}
        </Card>
      </div>

      <Card title="Shortcuts" icon="sparkles">
        <div className="shortcuts">
          <Link href="/users" className="shortcut">
            <Icon name="search" /> Find a member
          </Link>
          <Link href="/plans" className="shortcut">
            <Icon name="calendar" /> Browse plans
          </Link>
          <Link href="/messages" className="shortcut">
            <Icon name="message" /> Held messages
          </Link>
          {full ? (
            <>
              <Link href="/venues/new" className="shortcut">
                <Icon name="plus" /> Add a venue
              </Link>
              <Link href="/cities" className="shortcut">
                <Icon name="building" /> Launch a city
              </Link>
              <Link href="/settings" className="shortcut">
                <Icon name="settings" /> App settings
              </Link>
            </>
          ) : null}
        </div>
      </Card>
    </Page>
  );
}
