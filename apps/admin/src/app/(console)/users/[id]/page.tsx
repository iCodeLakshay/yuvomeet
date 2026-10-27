import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Empty, Facts, Page, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';
import { signMedia } from '@/lib/media';
import { setGender, setRole, setUserStatus } from '../../actions';

/** AD-2, AD-3: everything a reviewer needs about one member, plus the account actions. */
export default async function UserRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role } = await requireAdmin();
  const [{ data: summary }, { data: profile }, photos, received, given, checks, audit, hosted] = await Promise.all([
    supabase.from('admin_user_summary').select('*').eq('id', id).maybeSingle(),
    supabase.from('profiles').select('first_name, bio, bio_status, area_name, interests, birth_year, status_reason, college_id, colleges(name)').eq('id', id).maybeSingle(),
    supabase.from('profile_photos').select('id, path, status, position').eq('user_id', id).order('position'),
    supabase.from('reports').select('*').eq('target_user_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('reports').select('*').eq('reporter_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('verification_checks').select('type, verdict, ai_score, attempt, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('audit_log').select('*').eq('subject_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('plans').select('id, title, status, starts_at, late_cancel').eq('host_id', id).order('starts_at', { ascending: false }).limit(10),
  ]);
  if (!summary) notFound();
  const urls = await signMedia(supabase, (photos.data ?? []).map((p) => p.path));
  const full = role === 'admin';
  const birthYear = profile?.birth_year;

  return (
    <Page title={summary.first_name || 'Member'} subtitle={<code>{id}</code>}>
      <Card>
        <Facts
          items={[
            ['Status', <Badge key="s" value={summary.status} />],
            ['Verification', <Badge key="v" value={summary.verification_status} />],
            ['Declared gender', humanize(summary.declared_gender)],
            ['Verified gender', humanize(summary.verified_gender)],
            ['Birth year (from ID)', birthYear ?? '—'],
            ['Area', profile?.area_name ?? '—'],
            ['College', (profile?.colleges as { name: string } | null)?.name ?? '—'],
            ['Joined', formatDateTime(summary.created_at)],
            ['Attended / no-show', `${summary.plans_attended ?? 0} / ${summary.plans_no_show ?? 0}`],
            ['Hosted', summary.plans_hosted ?? 0],
            ['Late cancels (30d)', summary.late_cancel_count_30d ?? 0],
            ['Unsafe ratings (30d)', summary.unsafe_ratings_30d ?? 0],
          ]}
        />
        {profile?.status_reason ? <p className="muted">Status reason: {profile.status_reason}</p> : null}
        {profile?.bio ? (
          <p>
            {profile.bio} <Badge value={profile.bio_status} />
          </p>
        ) : null}
      </Card>

      <Card title="Photos">
        {photos.data?.length ? (
          <div className="thumbs">
            {photos.data.map((p) =>
              p.path && urls.get(p.path) ? (
                <figure key={p.id} style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls.get(p.path)} alt={`Photo ${p.position + 1}`} />
                  <figcaption>
                    <Badge value={p.status} />
                  </figcaption>
                </figure>
              ) : null,
            )}
          </div>
        ) : (
          <Empty>No photos.</Empty>
        )}
      </Card>

      <div className="grid2">
        <Card title="Account status">
          <ActionForm
            action={setUserStatus}
            hidden={{ user_id: id }}
            confirm="Apply this account change? It is recorded in the audit log."
            buttons={[
              { label: 'Suspend', value: 'suspended', tone: 'danger' },
              ...(full
                ? [
                    { label: 'Ban', value: 'banned', tone: 'danger' as const },
                    { label: 'Restore', value: 'active', tone: 'primary' as const },
                  ]
                : []),
            ]}
          />
          {!full ? <p className="muted">Bans and restores need an admin. Escalate from the queue.</p> : null}
        </Card>
        {full ? (
          <Card title="Gender correction (S-42)">
            <ActionForm action={setGender} hidden={{ user_id: id }} buttons={[{ label: 'Save gender' }]}>
              <select name="gender" defaultValue={summary.declared_gender ?? 'woman'} aria-label="Gender">
                <option value="woman">Woman</option>
                <option value="man">Man</option>
                <option value="other">Other</option>
              </select>
            </ActionForm>
          </Card>
        ) : null}
        {full ? (
          <Card title="Console role">
            <ActionForm action={setRole} hidden={{ user_id: id }} buttons={[{ label: 'Save role' }]}>
              <select name="role" defaultValue="" aria-label="Role">
                <option value="">No console access</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
              </select>
            </ActionForm>
          </Card>
        ) : null}
      </div>

      <div className="grid2">
        <Card title={`Reports received (${received.data?.length ?? 0})`}>
          {received.data?.length ? (
            <table>
              <tbody>
                {received.data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Badge value={r.reason} />
                    </td>
                    <td>
                      <Badge value={r.status} />
                    </td>
                    <td>
                      by <UserLink id={r.reporter_id} />
                    </td>
                    <td className="muted">{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>None.</Empty>
          )}
        </Card>
        <Card title={`Reports given (${given.data?.length ?? 0})`}>
          {given.data?.length ? (
            <table>
              <tbody>
                {given.data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Badge value={r.reason} />
                    </td>
                    <td>
                      about <UserLink id={r.target_user_id} />
                    </td>
                    <td className="muted">{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>None.</Empty>
          )}
        </Card>
      </div>

      <div className="grid2">
        <Card title="Verification">
          {checks.data?.length ? (
            <table>
              <tbody>
                {checks.data.map((c, i) => (
                  <tr key={i}>
                    <td>{humanize(c.type)}</td>
                    <td>
                      <Badge value={c.verdict} />
                    </td>
                    <td>{c.ai_score ?? '—'}</td>
                    <td className="muted">
                      attempt {c.attempt} · {formatDateTime(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No checks yet.</Empty>
          )}
        </Card>
        <Card title="Hosted plans">
          {hosted.data?.length ? (
            <table>
              <tbody>
                {hosted.data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/plans/${p.id}`}>{p.title}</Link>
                    </td>
                    <td>
                      <Badge value={p.status} />
                      {p.late_cancel ? <Badge value="late cancel" tone="warning" /> : null}
                    </td>
                    <td className="muted">{formatDateTime(p.starts_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>None.</Empty>
          )}
        </Card>
      </div>

      <Card title="Action history">
        {audit.data?.length ? (
          <table>
            <tbody>
              {audit.data.map((a) => (
                <tr key={a.id}>
                  <td>{humanize(a.action)}</td>
                  <td>{a.reason}</td>
                  <td>
                    <UserLink id={a.admin_id} />
                  </td>
                  <td className="muted">{formatDateTime(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No admin actions on this account.</Empty>
        )}
      </Card>
    </Page>
  );
}
