import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ActionForm, type ActionButton } from '@/components/ActionForm';
import { Badge, Card, Due, Empty, Facts, Page, UserLink } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, humanize } from '@/lib/format';
import { signMedia } from '@/lib/media';
import type { Db } from '@/lib/supabase';
import { claimItem, decideItem, removeMessage } from '../../actions';

/** What approve / reject mean for each subject (admin_decide_item). */
const BUTTONS: Record<string, [string, string]> = {
  photo: ['Approve photo', 'Reject photo'],
  text: ['Show text', 'Remove text'],
  verification: ['Verify member', 'Reject verification'],
  report: ['Dismiss report', 'Mark actioned'],
  venue: ['Approve venue', 'Archive venue'],
  rating_review: ['No action needed', 'Action taken'],
};

async function Thread({ db, messageId, itemId }: { db: Db; messageId: string; itemId: string }) {
  const { data: focus } = await db.from('messages').select('*').eq('id', messageId).maybeSingle();
  if (!focus) return <Empty>The message no longer exists.</Empty>;
  // Moderation doc: 10 messages either side for context.
  const [before, after] = await Promise.all([
    db.from('messages').select('*').eq('conversation_id', focus.conversation_id).lt('created_at', focus.created_at).order('created_at', { ascending: false }).limit(10),
    db.from('messages').select('*').eq('conversation_id', focus.conversation_id).gt('created_at', focus.created_at).order('created_at').limit(10),
  ]);
  const thread = [...(before.data ?? []).reverse(), focus, ...(after.data ?? [])];
  const urls = await signMedia(db, thread.map((m) => m.image_path));
  const { data: convo } = await db.from('conversations').select('plan_id').eq('id', focus.conversation_id).maybeSingle();

  return (
    <div className="stack">
      {convo?.plan_id ? <Link href={`/plans/${convo.plan_id}`}>Open plan and members</Link> : null}
      {thread.map((m) => (
        <div key={m.id} className={`msg${m.id === focus.id ? ' focus' : ''}`}>
          <div className="row">
            <UserLink id={m.sender_id} />
            <span className="muted">{formatDateTime(m.created_at)}</span>
            {m.status !== 'visible' ? <Badge value={m.status} /> : null}
          </div>
          {m.body ? <div>{m.body}</div> : null}
          {m.image_path && urls.get(m.image_path) ? (
            <div className="thumbs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls.get(m.image_path)} alt="Chat photo" />
            </div>
          ) : null}
        </div>
      ))}
      {focus.status !== 'rejected' ? (
        <ActionForm action={removeMessage} hidden={{ message_id: focus.id, item_id: itemId, plan_id: convo?.plan_id ?? '' }} buttons={[{ label: 'Remove highlighted message', tone: 'danger' }]} />
      ) : null}
    </div>
  );
}

async function Context({ db, item }: { db: Db; item: { id: string; subject: string; subject_id: string; user_id: string } }): Promise<ReactNode> {
  switch (item.subject) {
    case 'photo': {
      const [{ data: photo }, { data: msg }, { data: cover }] = await Promise.all([
        db.from('profile_photos').select('*').eq('id', item.subject_id).maybeSingle(),
        db.from('messages').select('id, image_path, conversation_id').eq('id', item.subject_id).maybeSingle(),
        db.from('plan_covers').select('id, path').eq('id', item.subject_id).maybeSingle(),
      ]);
      const path = photo?.path ?? msg?.image_path ?? cover?.path;
      const urls = await signMedia(db, [path]);
      return (
        <Card title={photo ? 'Profile photo' : cover ? 'Plan banner' : 'Chat photo'}>
          {path && urls.get(path) ? (
            <div className="thumbs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls.get(path)} alt="Photo under review" style={{ width: 280, height: 280 }} />
            </div>
          ) : (
            <Empty>The image is not available.</Empty>
          )}
          {photo?.reject_reason ? <p className="muted">Earlier reason: {photo.reject_reason}</p> : null}
        </Card>
      );
    }
    case 'text': {
      const [{ data: msg }, { data: profile }] = await Promise.all([
        db.from('messages').select('id').eq('id', item.subject_id).maybeSingle(),
        db.from('profiles').select('bio, bio_status').eq('id', item.subject_id).maybeSingle(),
      ]);
      if (msg) {
        return (
          <Card title="Held chat message">
            <Thread db={db} messageId={msg.id} itemId={item.id} />
          </Card>
        );
      }
      return (
        <Card title="Profile bio">
          <p>{profile?.bio ?? '—'}</p>
          <Badge value={profile?.bio_status} />
        </Card>
      );
    }
    case 'verification': {
      const { data: checks } = await db.from('verification_checks').select('*').eq('user_id', item.subject_id).order('created_at', { ascending: false });
      return (
        <Card title="Verification checks (scores and reason codes only, S-47)">
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Verdict</th>
                <th>Score</th>
                <th>Attempt</th>
                <th>Reason codes</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(checks ?? []).map((c) => (
                <tr key={c.id}>
                  <td>{humanize(c.type)}</td>
                  <td>
                    <Badge value={c.verdict} />
                  </td>
                  <td>{c.ai_score ?? '—'}</td>
                  <td>{c.attempt}</td>
                  <td>
                    <code>{JSON.stringify((c.evidence as { reasons?: unknown })?.reasons ?? c.evidence)}</code>
                  </td>
                  <td>{formatDateTime(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      );
    }
    case 'report': {
      const { data: report } = await db.from('reports').select('*').eq('id', item.subject_id).maybeSingle();
      if (!report) return <Empty>Report not found.</Empty>;
      return (
        <>
          <Card title="Report">
            <Facts
              items={[
                ['Reason', <Badge key="r" value={report.reason} />],
                ['Severity', <Badge key="s" value={report.severity} />],
                ['Reported member', <UserLink key="t" id={report.target_user_id} />],
                ['Reported by', <UserLink key="b" id={report.reporter_id} />],
                ['Plan', report.plan_id ? <Link key="p" href={`/plans/${report.plan_id}`}>Open plan</Link> : '—'],
                ['Filed', formatDateTime(report.created_at)],
              ]}
            />
            {report.details ? <p>{report.details}</p> : <p className="muted">No details given.</p>}
          </Card>
          {report.message_id ? (
            <Card title="Reported message with context">
              <Thread db={db} messageId={report.message_id} itemId={item.id} />
            </Card>
          ) : null}
        </>
      );
    }
    case 'rating_review': {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data: ratings } = await db.from('ratings').select('*').eq('ratee_id', item.subject_id).eq('felt_safe', false).gte('created_at', since);
      return (
        <Card title="Unsafe ratings in the last 30 days">
          <table>
            <thead>
              <tr>
                <th>Rater</th>
                <th>Plan</th>
                <th>Showed up</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(ratings ?? []).map((r) => (
                <tr key={`${r.plan_id}-${r.rater_id}`}>
                  <td>
                    <UserLink id={r.rater_id} />
                  </td>
                  <td>
                    <Link href={`/plans/${r.plan_id}`}>Open</Link>
                  </td>
                  <td>{r.showed_up ? 'Yes' : 'No'}</td>
                  <td>{formatDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      );
    }
    case 'venue':
      return (
        <Card title="Venue">
          <Link href={`/venues/${item.subject_id}`}>Open venue</Link>
        </Card>
      );
    case 'appeal':
      return (
        <Card title="Appeal">
          <p>
            Answer this from <Link href="/appeals">Appeals</Link> so the member gets your written response.
          </p>
        </Card>
      );
    default:
      return null;
  }
}

export default async function QueueItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, role } = await requireAdmin();
  const { data: item } = await supabase.from('moderation_queue').select('*').eq('id', id).maybeSingle();
  if (!item) notFound();

  const open = item.status === 'pending' || item.status === 'in_review' || item.status === 'escalated';
  const claimedByOther = item.status === 'in_review' && item.assigned_to !== userId;
  const [approve, reject] = BUTTONS[item.subject] ?? ['Approve', 'Reject'];
  const buttons: ActionButton[] = [
    { label: approve, value: 'approve', tone: 'primary' },
    { label: reject, value: 'reject', tone: 'danger' },
    ...(item.status !== 'escalated' ? [{ label: 'Escalate to admin', value: 'escalate' }] : []),
  ];

  return (
    <Page title={humanize(item.subject)} subtitle={<Link href="/queue">Back to queue</Link>}>
      <Card>
        <Facts
          items={[
            ['Status', <Badge key="st" value={item.status} />],
            ['Severity', <Badge key="sv" value={item.severity} />],
            ['Member', <UserLink key="u" id={item.user_id} />],
            ['Automated verdict', item.ai_verdict ? <Badge key="ai" value={item.ai_verdict} /> : '—'],
            ['Score', item.ai_score ?? '—'],
            ['Labels', Array.isArray(item.ai_labels) ? (item.ai_labels as string[]).join(', ') || '—' : '—'],
            ['Due', open ? <Due key="d" at={item.due_at} /> : formatDateTime(item.decided_at)],
            ['Decision', item.decision_reason ?? '—'],
          ]}
        />
      </Card>
      <Context db={supabase} item={item} />
      {open && item.subject !== 'appeal' ? (
        <Card title="Decision">
          {item.status === 'pending' || claimedByOther ? (
            <ActionForm action={claimItem} hidden={{ item_id: item.id }} reason={false} buttons={[{ label: claimedByOther ? 'Take over (claim older than 30 min)' : 'Claim this item' }]} />
          ) : null}
          {item.status === 'escalated' && role !== 'admin' ? (
            <p className="muted">Escalated items are decided by an admin.</p>
          ) : (
            <ActionForm action={decideItem} hidden={{ item_id: item.id }} buttons={buttons} />
          )}
        </Card>
      ) : null}
    </Page>
  );
}
