import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/ActionForm';
import { Brand } from '@/components/Brand';
import { Badge, Card, ClientTable, Empty, Facts, LinkButton, Page, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatDateTime, formatPaise, humanize } from '@/lib/format';
import { signMedia } from '@/lib/media';
import { setGender, setRole, setUserStatus } from '../../actions';
import { deleteUser, grantKycAttempt, sendNotification, setEntitlement, setPhotoStatus, updateProfile } from '../../manage-actions';

/** AD-2, AD-3: everything about one member, plus every account action. */
export default async function UserRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, role, userId } = await requireAdmin();
  const full = role === 'admin';
  const [{ data: summary }, { data: profile }, photos, received, given, checks, audit, hosted, joined, payments, kyc, cities, payout] = await Promise.all([
    supabase.from('admin_user_summary').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('profiles')
      .select('first_name, bio, bio_status, area_name, interests, languages, birth_year, status_reason, city_id, college_id, entitlement, entitlement_until, verified_at, rules_accepted_at, deleted_at, colleges(name), cities(name)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('profile_photos').select('id, path, status, position, reject_reason').eq('user_id', id).order('position'),
    supabase.from('reports').select('id, reason, status, reporter_id, target_user_id, created_at').eq('target_user_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('reports').select('id, reason, status, reporter_id, target_user_id, created_at').eq('reporter_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('verification_checks').select('type, verdict, ai_score, attempt, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('audit_log').select('id, action, reason, admin_id, created_at').eq('subject_id', id).order('created_at', { ascending: false }).limit(200),
    supabase.from('plans').select('id, title, status, starts_at, late_cancel').eq('host_id', id).order('starts_at', { ascending: false }).limit(50),
    supabase.from('plan_members').select('status, plans(id, title, starts_at)').eq('user_id', id).order('requested_at', { ascending: false }).limit(50),
    full ? supabase.from('payments').select('id, kind, product_id, amount_paise, status, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: null }),
    supabase.from('admin_kyc_extra').select('granted').eq('user_id', id).maybeSingle(),
    full ? supabase.from('cities').select('id, name').order('name') : Promise.resolve({ data: null }),
    full ? supabase.from('payout_accounts').select('upi_id, holder_name').eq('user_id', id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!summary) notFound();
  const { data: colleges } = full && profile?.city_id ? await supabase.from('colleges').select('id, name').eq('city_id', profile.city_id).order('name') : { data: null };
  const urls = await signMedia(supabase, (photos.data ?? []).map((p) => p.path));
  const self = id === userId;
  const deleted = summary.status === 'deleted';
  const until = profile?.entitlement_until ? profile.entitlement_until.slice(0, 10) : '';

  return (
    <Page
      title={summary.first_name || 'Member'}
      icon="userCheck"
      crumbs={[{ href: '/users', label: 'Members' }]}
      subtitle={<code>{id}</code>}
      actions={
        full ? (
          <>
            <ActionForm
              dialog={{ label: 'Edit profile', icon: 'edit', description: 'Correct a name, a bio, or the member’s city and college.' }}
              action={updateProfile}
              hidden={{ user_id: id }}
              buttons={[{ label: 'Save profile', tone: 'primary', icon: 'save' }]}
            >
              <label className="field">
                <span>First name</span>
                <input name="first_name" defaultValue={profile?.first_name ?? ''} required maxLength={30} />
              </label>
              <label className="field">
                <span>Bio</span>
                <textarea name="bio" defaultValue={profile?.bio ?? ''} maxLength={300} rows={3} />
              </label>
              <div className="formgrid">
                <label className="field">
                  <span>Bio visibility</span>
                  <select name="bio_status" defaultValue={profile?.bio_status ?? 'visible'}>
                    <option value="visible">Visible</option>
                    <option value="held">Held for review</option>
                    <option value="rejected">Hidden (rejected)</option>
                  </select>
                </label>
                <label className="field">
                  <span>City</span>
                  <select name="city_id" defaultValue={profile?.city_id ?? ''}>
                    <option value="">No city</option>
                    {(cities.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>College</span>
                  <select name="college_id" defaultValue={profile?.college_id ?? ''}>
                    <option value="">None</option>
                    {(colleges ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <small>Colleges of the current city. Change the city first to pick another.</small>
                </label>
              </div>
            </ActionForm>
            <ActionForm
              dialog={{ label: 'Message', icon: 'send', title: 'Send a message', description: 'Arrives as an in-app notification and a push.' }}
              action={sendNotification}
              hidden={{ audience: 'user', user_id: id }}
              buttons={[{ label: 'Send', tone: 'primary', icon: 'send' }]}
            >
              <label className="field">
                <span>Title</span>
                <input name="title" required minLength={3} maxLength={60} />
              </label>
              <label className="field">
                <span>Message</span>
                <textarea name="body" required minLength={3} maxLength={240} rows={3} />
              </label>
            </ActionForm>
          </>
        ) : null
      }
    >
      <Card>
        <Facts
          items={[
            ['Status', <Badge key="s" value={summary.status} />],
            ['Verification', <Badge key="v" value={summary.verification_status} />],
            ['Plan', <Badge key="e" value={profile?.entitlement ?? 'free'} />],
            ['Plan ends', profile?.entitlement_until ? formatDate(profile.entitlement_until) : '—'],
            ['Declared gender', humanize(summary.declared_gender)],
            ['Verified gender', humanize(summary.verified_gender)],
            ['Birth year (from ID)', profile?.birth_year ?? '—'],
            ['City', (profile?.cities as { name: string } | null)?.name ?? '—'],
            ['Area', profile?.area_name || '—'],
            ['College', (profile?.colleges as { name: string } | null)?.name ?? '—'],
            ['Joined', formatDateTime(summary.created_at)],
            ['Verified on', formatDate(profile?.verified_at)],
            ['Attended / no-show', `${summary.plans_attended ?? 0} / ${summary.plans_no_show ?? 0}`],
            ['Hosted', summary.plans_hosted ?? 0],
            ['Late cancels (30d)', summary.late_cancel_count_30d ?? 0],
            ['Unsafe ratings (30d)', summary.unsafe_ratings_30d ?? 0],
            ['Extra KYC attempts', kyc.data?.granted ?? 0],
            ['Languages', (profile?.languages ?? []).join(', ') || '—'],
          ]}
        />
        {profile?.interests?.length ? (
          <div className="row">
            {profile.interests.map((i) => (
              <span key={i} className="chip">
                {humanize(i)}
              </span>
            ))}
          </div>
        ) : null}
        {profile?.status_reason ? <p className="muted">Status reason: {profile.status_reason}</p> : null}
        {profile?.bio ? (
          <p>
            {profile.bio} <Badge value={profile.bio_status} />
          </p>
        ) : null}
      </Card>

      <Card title="Photos" icon="image">
        {photos.data?.length ? (
          <div className="thumbs">
            {photos.data.map((p) => (
              <figure key={p.id} className="thumb">
                {p.path && urls.get(p.path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls.get(p.path)} alt={`Photo ${p.position + 1}`} />
                ) : (
                  <div className="empty" style={{ width: 140, height: 140, padding: 8 }}>
                    In screening
                  </div>
                )}
                <figcaption className="spread">
                  <Badge value={p.status} />
                  {p.status === 'rejected' ? (
                    p.path ? (
                      <ActionForm
                        dialog={{ label: '', icon: 'restore', compact: true, title: 'Restore photo' }}
                        action={setPhotoStatus}
                        hidden={{ user_id: id, photo_id: p.id }}
                        buttons={[{ label: 'Restore photo', value: 'approved', tone: 'primary', icon: 'restore' }]}
                      />
                    ) : null
                  ) : (
                    <ActionForm
                      dialog={{ label: '', icon: 'hide', tone: 'danger', compact: true, title: 'Take photo down', description: 'The member sees the reason you write.' }}
                      action={setPhotoStatus}
                      hidden={{ user_id: id, photo_id: p.id }}
                      buttons={[{ label: 'Take down', value: 'rejected', tone: 'danger', icon: 'hide' }]}
                    />
                  )}
                </figcaption>
                {p.reject_reason ? <span className="muted small">{p.reject_reason}</span> : null}
              </figure>
            ))}
          </div>
        ) : (
          <Empty icon="image">No photos.</Empty>
        )}
      </Card>

      {!self && !deleted ? (
        <div className="grid3">
          <Card title="Account status" icon="shield">
            <p className="muted small">Suspending or banning signs the member out at once.</p>
            <div className="row">
              {summary.status !== 'suspended' ? (
                <ActionForm
                  dialog={{ label: 'Suspend', icon: 'userX', tone: 'danger', description: 'The member cannot use the app until restored.' }}
                  action={setUserStatus}
                  hidden={{ user_id: id }}
                  confirm="Suspend this account? It is recorded in the audit log."
                  buttons={[{ label: 'Suspend', value: 'suspended', tone: 'danger', icon: 'userX' }]}
                />
              ) : null}
              {full && summary.status !== 'banned' ? (
                <ActionForm
                  dialog={{ label: 'Ban', icon: 'ban', tone: 'danger', description: 'Cancels their hosted plans, removes them from others, and blocks the identity from signing up again.' }}
                  action={setUserStatus}
                  hidden={{ user_id: id }}
                  confirm="Ban this account permanently?"
                  buttons={[{ label: 'Ban', value: 'banned', tone: 'danger', icon: 'ban' }]}
                />
              ) : null}
              {full && (summary.status === 'suspended' || summary.status === 'banned') ? (
                <ActionForm
                  dialog={{ label: 'Restore', icon: 'restore', tone: 'success' }}
                  action={setUserStatus}
                  hidden={{ user_id: id }}
                  buttons={[{ label: 'Restore account', value: 'active', tone: 'primary', icon: 'restore' }]}
                />
              ) : null}
            </div>
            {!full ? <p className="muted small">Bans and restores need an admin. Escalate from the queue.</p> : null}
          </Card>

          {full ? (
            <Card title="Plan and billing" icon="card">
              <p className="muted small">
                Currently <strong>{humanize(profile?.entitlement ?? 'free')}</strong>
                {profile?.entitlement_until ? ` until ${formatDate(profile.entitlement_until)}` : ''}.
              </p>
              <ActionForm
                dialog={{ label: 'Change plan', icon: 'card', description: 'Comp a pass, extend one, or end it. Payments are not charged or refunded here.' }}
                action={setEntitlement}
                hidden={{ user_id: id }}
                buttons={[{ label: 'Save plan', tone: 'primary', icon: 'save' }]}
              >
                <div className="formgrid">
                  <label className="field">
                    <span>Plan</span>
                    <select name="tier" defaultValue={profile?.entitlement ?? 'free'}>
                      <option value="free">Free</option>
                      <option value="plus">Plus</option>
                      <option value="premium">Premium</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Ends on</span>
                    <input name="until" type="date" defaultValue={until} />
                    <small>Ignored for Free.</small>
                  </label>
                </div>
              </ActionForm>
              {payout.data ? (
                <p className="muted small brandline">
                  <Brand name="upi" size={14} /> Payouts to {payout.data.upi_id} ({payout.data.holder_name})
                </p>
              ) : null}
            </Card>
          ) : null}

          {full ? (
            <Card title="Identity and access" icon="key">
              <div className="row">
                <ActionForm
                  dialog={{ label: 'Gender', icon: 'edit', title: 'Gender correction (S-42)', description: 'Sets both the declared and verified gender.' }}
                  action={setGender}
                  hidden={{ user_id: id }}
                  buttons={[{ label: 'Save gender', tone: 'primary', icon: 'save' }]}
                >
                  <select name="gender" defaultValue={summary.declared_gender ?? 'woman'} aria-label="Gender">
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                    <option value="other">Other</option>
                  </select>
                </ActionForm>
                <ActionForm
                  dialog={{ label: 'KYC attempt', icon: 'verify', title: 'Grant an extra verification attempt', description: 'Lets the member try verification once more, past the retry limit.' }}
                  action={grantKycAttempt}
                  hidden={{ user_id: id }}
                  buttons={[{ label: 'Grant attempt', tone: 'primary', icon: 'verify' }]}
                />
                <ActionForm
                  dialog={{ label: 'Console role', icon: 'role', description: 'Reviewers moderate; admins also manage places, money and settings.' }}
                  action={setRole}
                  hidden={{ user_id: id }}
                  buttons={[{ label: 'Save role', tone: 'primary', icon: 'save' }]}
                >
                  <select name="role" defaultValue="" aria-label="Role">
                    <option value="">No console access</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </ActionForm>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="grid2">
        <Card title={`Reports received (${received.data?.length ?? 0})`} icon="flag" flush>
          {received.data?.length ? (
            <ClientTable>
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
                    <td className="muted">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </ClientTable>
          ) : (
            <Empty icon="flag">None.</Empty>
          )}
        </Card>
        <Card title={`Reports given (${given.data?.length ?? 0})`} icon="flag" flush>
          {given.data?.length ? (
            <ClientTable>
                {given.data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Badge value={r.reason} />
                    </td>
                    <td>
                      about <UserLink id={r.target_user_id} />
                    </td>
                    <td className="muted">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </ClientTable>
          ) : (
            <Empty icon="flag">None.</Empty>
          )}
        </Card>
      </div>

      <div className="grid2">
        <Card title="Verification checks" icon="verify" flush>
          {checks.data?.length ? (
            <ClientTable>
                {checks.data.map((c, i) => (
                  <tr key={i}>
                    <td>{humanize(c.type)}</td>
                    <td>
                      <Badge value={c.verdict} />
                    </td>
                    <td>{c.ai_score ?? '—'}</td>
                    <td className="muted">
                      attempt {c.attempt} · {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </ClientTable>
          ) : (
            <Empty icon="verify">No checks yet.</Empty>
          )}
        </Card>
        <Card title="Plans" icon="calendar" flush>
          {hosted.data?.length || joined.data?.length ? (
            <ClientTable label="plans">
                {(hosted.data ?? []).map((p) => (
                  <tr key={`h${p.id}`}>
                    <td>
                      <Link href={`/plans/${p.id}`}>{p.title}</Link>
                    </td>
                    <td>
                      <Badge value="host" tone="accent" />
                    </td>
                    <td>
                      <Badge value={p.status} />
                    </td>
                    <td className="muted">{formatDate(p.starts_at)}</td>
                  </tr>
                ))}
                {(joined.data ?? []).map((m) => {
                  const p = m.plans as { id: string; title: string; starts_at: string } | null;
                  return p ? (
                    <tr key={`j${p.id}`}>
                      <td>
                        <Link href={`/plans/${p.id}`}>{p.title}</Link>
                      </td>
                      <td>
                        <span className="muted">member</span>
                      </td>
                      <td>
                        <Badge value={m.status} />
                      </td>
                      <td className="muted">{formatDate(p.starts_at)}</td>
                    </tr>
                  ) : null;
                })}
              </ClientTable>
          ) : (
            <Empty icon="calendar">None.</Empty>
          )}
        </Card>
      </div>

      {full ? (
        <Card title="Payments" icon="card" actions={<LinkButton href={`/payments?user=${id}`} size="sm" icon="next">All</LinkButton>} flush>
          {payments.data?.length ? (
            <ClientTable>
                {payments.data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="brandline">
                        <Brand name="razorpay" size={14} /> {humanize(p.kind)} · {p.product_id}
                      </span>
                    </td>
                    <td className="num">{formatPaise(p.amount_paise)}</td>
                    <td>
                      <Badge value={p.status} />
                    </td>
                    <td className="muted">{formatDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </ClientTable>
          ) : (
            <Empty icon="card">No payments.</Empty>
          )}
        </Card>
      ) : null}

      <Card title="Action history" icon="history" flush>
        {audit.data?.length ? (
          <ClientTable>
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
            </ClientTable>
        ) : (
          <Empty icon="history">No admin actions on this account.</Empty>
        )}
      </Card>

      {full && !self && !deleted ? (
        <div className="card danger-zone">
          <div className="card-head">
            <h2>Delete account</h2>
            <ActionForm
              dialog={{ label: 'Delete account', icon: 'trash', tone: 'danger', description: 'Cancels their plans, signs them out, and purges their data after 30 days. This cannot be undone.' }}
              action={deleteUser}
              hidden={{ user_id: id }}
              buttons={[{ label: 'Delete account', tone: 'danger', icon: 'trash' }]}
            >
              <label className="field">
                <span>Type DELETE to confirm</span>
                <input name="confirm_text" required autoComplete="off" pattern="DELETE" />
              </label>
            </ActionForm>
          </div>
          <p className="muted small">For erasure requests and fraud. To stop someone using the app while you investigate, suspend instead.</p>
        </div>
      ) : null}
    </Page>
  );
}
