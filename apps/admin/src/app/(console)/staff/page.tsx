import { ActionForm } from '@/components/ActionForm';
import { Brand } from '@/components/Brand';
import { Badge, Card, ClientTable, Empty, LoadError, Page, UserLink } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { formatAgo, formatDate } from '@/lib/format';
import { addStaff, changeStaffRole } from '../manage-actions';

/** Who can use this console. Reviewers moderate; admins also run places, money, settings and staff. */
export default async function Staff() {
  const { supabase, userId } = await requireFullAdmin();
  // A function, not a view: it reads staff emails from auth.users and refuses anyone but a full admin.
  const { data: staff, error } = await supabase.rpc('admin_list_staff');

  return (
    <Page
      title="Staff & roles"
      icon="role"
      subtitle={
        <span className="brandline">
          Everyone here signs in with an email, a password and a <Brand name="googleAuthenticator" size={14} label="Authenticator app" /> 6-digit code.
        </span>
      }
      actions={
        <ActionForm
          dialog={{ label: 'Add staff', icon: 'plus', tone: 'primary', description: 'The person needs a Hengout account with this email first. They set up two-step sign-in on their first visit.' }}
          action={addStaff}
          buttons={[{ label: 'Grant access', tone: 'primary', icon: 'key' }]}
        >
          <div className="formgrid">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required autoComplete="off" />
            </label>
            <label className="field">
              <span>Role</span>
              <select name="role" defaultValue="reviewer">
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
        </ActionForm>
      }
    >
      <div className="grid2">
        <Card title="Reviewer" icon="shield">
          <p className="muted">Works the review queue, reports, appeals and chats. Can suspend, cancel plans, remove members and messages. Cannot ban, restore, or see money and settings.</p>
        </Card>
        <Card title="Admin" icon="shieldAlert">
          <p className="muted">Everything a reviewer can do, plus bans, restores, escalations, cities, venues, colleges, payments, payouts, announcements, settings and staff.</p>
        </Card>
      </div>
      <LoadError error={error} />
      <Card flush>
        {staff?.length ? (
          <ClientTable
            pageSize={10}
            label="staff"
            head={
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Last sign-in</th>
                <th>Since</th>
                <th>Granted by</th>
                <th />
              </tr>
            }
          >
                {staff.map((s) => (
                  <tr key={s.user_id}>
                    <td>
                      <div className="row">
                        <span className="avatar" aria-hidden="true">
                          {(s.email?.[0] ?? '?').toUpperCase()}
                        </span>
                        <div className="cell-main">
                          <span>{s.email}</span>
                          <span className="muted">
                            <UserLink id={s.user_id} name={s.first_name || 'Open record'} />
                            {s.user_id === userId ? ' · you' : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge value={s.role} />
                    </td>
                    <td className="muted">{formatAgo(s.last_sign_in_at)}</td>
                    <td className="muted">{formatDate(s.created_at)}</td>
                    <td>{s.granted_by ? <UserLink id={s.granted_by} /> : <span className="muted">Set up directly</span>}</td>
                    <td className="actions">
                      {s.user_id !== userId ? (
                        <div className="row">
                          <ActionForm
                            dialog={{ label: '', icon: 'role', compact: true, title: `Change ${s.email}'s role`, description: 'Demoting signs them out so the new role applies at once.' }}
                            action={changeStaffRole}
                            hidden={{ user_id: s.user_id! }}
                            buttons={[s.role === 'admin' ? { label: 'Make reviewer', value: 'reviewer', icon: 'shield' } : { label: 'Make admin', value: 'admin', tone: 'primary', icon: 'shieldAlert' }]}
                          />
                          <ActionForm
                            dialog={{ label: '', icon: 'userMinus', tone: 'danger', compact: true, title: `Remove ${s.email}`, description: 'They lose console access and are signed out. Their member account stays.' }}
                            action={changeStaffRole}
                            hidden={{ user_id: s.user_id! }}
                            confirm="Remove this person's console access?"
                            buttons={[{ label: 'Remove access', value: 'none', tone: 'danger', icon: 'userMinus' }]}
                          />
                        </div>
                      ) : (
                        <span className="muted small">Another admin changes your role</span>
                      )}
                    </td>
                  </tr>
                ))}
          </ClientTable>
        ) : (
          <Empty icon="role">No staff yet.</Empty>
        )}
      </Card>
    </Page>
  );
}
