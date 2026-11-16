import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Empty, LoadError, Page, Pager, Tabs, Toolbar, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatAgo, formatDateTime, humanize, paging } from '@/lib/format';
import { setReportStatus } from '../manage-actions';

const REASONS = ['harassment', 'sexual_content', 'threat_or_violence', 'fake_profile', 'underage', 'spam_or_scam', 'no_show', 'unsafe_at_plan', 'other'] as const;
const STATUSES = ['open', 'actioned', 'dismissed'] as const;

type Search = { status?: string; reason?: string; severity?: string; page?: string; size?: string };

/** Every member report, including ones already decided from the queue. */
export default async function Reports({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? (sp.status as (typeof STATUSES)[number]) : 'open';
  const reason = REASONS.includes(sp.reason as (typeof REASONS)[number]) ? (sp.reason as (typeof REASONS)[number]) : undefined;
  const severity = sp.severity === 'severe' || sp.severity === 'standard' ? sp.severity : undefined;
  const { page, size, from, to } = paging(sp.page, sp.size);

  let q = supabase.from('reports').select('id, reason, severity, target_user_id, reporter_id, details, plan_id, created_at', { count: 'exact' }).eq('status', status).order('severity').order('created_at', { ascending: false }).range(from, to);
  if (reason) q = q.eq('reason', reason);
  if (severity) q = q.eq('severity', severity);
  const { data: reports, count, error } = await q;

  // Names for the people in this page of results (reports keep ids even after an account is deleted).
  const ids = [...new Set((reports ?? []).flatMap((r) => [r.reporter_id, r.target_user_id]))];
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, first_name').in('id', ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id, p.first_name]));

  return (
    <Page title="Reports" icon="flag" subtitle="What members reported. Closing a report also closes its queue item.">
      <Tabs base="/reports" param="status" value={status} keep={{ reason, severity }} items={[['open', 'Open'], ['actioned', 'Actioned'], ['dismissed', 'Dismissed']]} />
      <Toolbar>
        <input type="hidden" name="status" value={status} />
        <select name="reason" defaultValue={reason ?? ''} aria-label="Reason">
          <option value="">Any reason</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {humanize(r)}
            </option>
          ))}
        </select>
        <select name="severity" defaultValue={severity ?? ''} aria-label="Severity">
          <option value="">Any severity</option>
          <option value="severe">Severe</option>
          <option value="standard">Standard</option>
        </select>
      </Toolbar>
      <LoadError error={error} />
      <Card flush>
        {reports?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Severity</th>
                  <th>Reported member</th>
                  <th>Reported by</th>
                  <th>Details</th>
                  <th>Filed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Badge value={r.reason} tone={r.severity === 'severe' ? 'danger' : 'neutral'} />
                    </td>
                    <td>
                      <Badge value={r.severity} />
                    </td>
                    <td>
                      <UserLink id={r.target_user_id} name={name.get(r.target_user_id)} />
                    </td>
                    <td>
                      <UserLink id={r.reporter_id} name={name.get(r.reporter_id)} />
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div className="cell-main">
                        <span>{r.details ? (r.details.length > 120 ? `${r.details.slice(0, 120)}…` : r.details) : <span className="muted">No details</span>}</span>
                        {r.plan_id ? (
                          <Link className="muted" href={`/plans/${r.plan_id}`}>
                            Open plan
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="muted" title={formatDateTime(r.created_at)}>
                      {formatAgo(r.created_at)}
                    </td>
                    <td className="actions">
                      <div className="row">
                        {status === 'open' ? (
                          <>
                            <ActionForm
                              dialog={{ label: 'Actioned', icon: 'check', tone: 'success', compact: true, title: 'Mark report actioned', description: 'Use this after acting on the member (suspend, remove content). This only closes the report.' }}
                              action={setReportStatus}
                              hidden={{ report_id: r.id }}
                              buttons={[{ label: 'Mark actioned', value: 'actioned', tone: 'primary', icon: 'check' }]}
                            />
                            <ActionForm
                              dialog={{ label: 'Dismiss', icon: 'close', compact: true, title: 'Dismiss report' }}
                              action={setReportStatus}
                              hidden={{ report_id: r.id }}
                              buttons={[{ label: 'Dismiss report', value: 'dismissed', icon: 'close' }]}
                            />
                          </>
                        ) : (
                          <ActionForm
                            dialog={{ label: 'Reopen', icon: 'restore', compact: true, title: 'Reopen report' }}
                            action={setReportStatus}
                            hidden={{ report_id: r.id }}
                            buttons={[{ label: 'Reopen', value: 'open', icon: 'restore' }]}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="flag">No {status} reports{reason ? ` for ${humanize(reason)}` : ''}.</Empty>
        )}
      </Card>
      <Pager base="/reports" params={{ status, reason, severity }} page={page} total={count} size={size} />
    </Page>
  );
}
