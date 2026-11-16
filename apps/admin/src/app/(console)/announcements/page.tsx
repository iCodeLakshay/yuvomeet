import { ActionForm } from '@/components/ActionForm';
import { Card, Empty, Page, Pager, UserLink } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { formatCount, formatDateTime, paging } from '@/lib/format';
import { sendNotification } from '../manage-actions';

type Sent = { title?: string; body?: string; recipients?: number };

/** In-app notifications (with push) to everyone, one city, or one member. Only active members receive them. */
export default async function Announcements({ searchParams }: { searchParams: Promise<{ page?: string; size?: string }> }) {
  const { supabase } = await requireFullAdmin();
  const sp = await searchParams;
  const { page, size, from, to } = paging(sp.page, sp.size);
  const [{ data: cities }, { data: history, count }] = await Promise.all([
    supabase.from('cities').select('id, name, status').order('name'),
    supabase.from('audit_log').select('id, admin_id, subject_type, subject_id, after, created_at', { count: 'exact' }).eq('action', 'announcement_send').order('id', { ascending: false }).range(from, to),
  ]);
  const cityName = new Map((cities ?? []).map((c) => [c.id, c.name]));

  return (
    <Page title="Announcements" icon="bell" subtitle="Messages from the Hengout team. They arrive as an in-app notification and a push.">
      <div className="grid2">
        <Card title="New announcement" icon="send">
          <ActionForm
            action={sendNotification}
            confirm="Send this announcement now? It cannot be recalled."
            reason="Why you are sending it (audit log only)"
            buttons={[{ label: 'Send announcement', tone: 'primary', icon: 'send' }]}
          >
            <div className="formgrid">
              <label className="field">
                <span>Send to</span>
                <select name="audience" defaultValue="city">
                  <option value="all">Every active member</option>
                  <option value="city">Active members in one city</option>
                  <option value="user">One member</option>
                </select>
              </label>
              <label className="field">
                <span>City</span>
                <select name="city_id" defaultValue={cities?.[0]?.id}>
                  {(cities ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <small>Used when sending to one city.</small>
              </label>
              <label className="field">
                <span>Member id</span>
                <input name="user_id" placeholder="Paste from the member page" autoComplete="off" />
                <small>Used when sending to one member.</small>
              </label>
            </div>
            <label className="field">
              <span>Title</span>
              <input name="title" required minLength={3} maxLength={60} placeholder="New venues in Kota" />
            </label>
            <label className="field">
              <span>Message</span>
              <textarea name="body" required minLength={3} maxLength={240} rows={3} placeholder="Short and specific. No links; the app cannot open them." />
            </label>
          </ActionForm>
        </Card>

        <Card title="Guidelines" icon="list">
          <ul className="stack muted">
            <li>Send to a city, not everyone, unless it truly concerns everyone.</li>
            <li>One announcement a week at most; members turn notifications off otherwise.</li>
            <li>Never include personal details, phone numbers or links.</li>
            <li>Safety incidents are told to the people involved, not announced.</li>
          </ul>
        </Card>
      </div>

      <Card title="Sent" icon="history" flush>
        {history?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Announcement</th>
                  <th>Audience</th>
                  <th className="num">Recipients</th>
                  <th>Sent by</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const a = (h.after ?? {}) as Sent;
                  return (
                    <tr key={h.id}>
                      <td style={{ maxWidth: 420 }}>
                        <div className="cell-main">
                          <strong>{a.title}</strong>
                          <span className="muted">{a.body}</span>
                        </div>
                      </td>
                      <td>{h.subject_type === 'all' ? 'Everyone' : h.subject_type === 'city' ? (cityName.get(h.subject_id) ?? 'A city') : <UserLink id={h.subject_id} />}</td>
                      <td className="num">{formatCount(a.recipients)}</td>
                      <td>
                        <UserLink id={h.admin_id} />
                      </td>
                      <td className="muted">{formatDateTime(h.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="bell">Nothing sent yet.</Empty>
        )}
      </Card>
      <Pager base="/announcements" params={{}} page={page} total={count} size={size} />
    </Page>
  );
}
