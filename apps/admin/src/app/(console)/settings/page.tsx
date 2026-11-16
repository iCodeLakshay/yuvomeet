import { ActionForm } from '@/components/ActionForm';
import { Card, ClientTable, Empty, LoadError, Page } from '@/components/ui';
import { SettingsTabs } from './tabs';
import { requireFullAdmin } from '@/lib/auth';
import { formatDateTime, formatPaise } from '@/lib/format';
import { saveSetting } from '../manage-actions';

type Meta = { label: string; help: string; unit?: 'paise' | 'bps' | 'hours' | 'minutes' | 'metres' | 'days' | 'percent' | 'time' };

/** What each key in private.settings controls. Keys not listed here still show, under "Other". */
const GROUPS: { title: string; icon: 'users' | 'message' | 'calendar' | 'pin' | 'verify' | 'card' | 'shield'; keys: Record<string, Meta> }[] = [
  {
    title: 'Limits for members',
    icon: 'users',
    keys: {
      free_joins_per_week: { label: 'Free joins per week', help: 'Plans a free member can join each week.' },
      free_hosts_per_week: { label: 'Free hosts per week', help: 'Plans a free member can host each week.' },
      new_account_days: { label: 'New-account period', help: 'Days an account counts as new, with lower limits.', unit: 'days' },
      new_join_per_day: { label: 'New accounts: joins per day', help: 'Join requests a new account can send per day.' },
      max_join_per_day: { label: 'Joins per day', help: 'Join requests any account can send per day.' },
      max_reports_per_day: { label: 'Reports per day', help: 'Reports one member can file per day.' },
      auto_suspend_reports: { label: 'Auto-suspend after reports', help: 'Number of reports that suspends an account automatically until a person reviews it.' },
    },
  },
  {
    title: 'Chat',
    icon: 'message',
    keys: {
      new_msg_per_day: { label: 'New accounts: messages per day', help: 'Messages a new account can send per day.' },
      max_msg_per_min: { label: 'Messages per minute', help: 'Flood limit for any account.' },
      chat_close_hours: { label: 'Chat stays open after a plan', help: 'Hours the plan chat stays open after the plan ends.', unit: 'hours' },
    },
  },
  {
    title: 'Plans',
    icon: 'calendar',
    keys: {
      plan_min_lead_hours: { label: 'Minimum notice', help: 'Hours between creating a plan and its start.', unit: 'hours' },
      plan_cutoff_local: { label: 'Latest start time', help: 'Plans cannot start after this local time unless the venue allows late events (S-32).', unit: 'time' },
      late_cancel_hours: { label: 'Late-cancel window', help: 'Cancelling within these hours of the start counts as a late cancel.', unit: 'hours' },
    },
  },
  {
    title: 'Check-in',
    icon: 'pin',
    keys: {
      checkin_radius_m: { label: 'Check-in radius', help: 'How close to the venue a member must be.', unit: 'metres' },
      checkin_window_min: { label: 'Check-in window', help: 'Minutes before and after the start when check-in is open.', unit: 'minutes' },
      checkin_max_accuracy_m: { label: 'Required GPS accuracy', help: 'Location fixes less accurate than this are refused.', unit: 'metres' },
    },
  },
  {
    title: 'Verification and screening',
    icon: 'verify',
    keys: {
      kyc_daily_cap: { label: 'Verifications per day', help: 'Daily cap on paid identity checks (cost control).' },
      kyc_face_pass: { label: 'Face match: pass at', help: 'Score at or above this passes automatically.', unit: 'percent' },
      kyc_face_review: { label: 'Face match: review at', help: 'Scores between this and the pass score go to a person.', unit: 'percent' },
      rekognition_reject: { label: 'Photo filter: reject at', help: 'Unsafe-image confidence that rejects a photo outright.', unit: 'percent' },
      rekognition_review: { label: 'Photo filter: review at', help: 'Confidence that sends a photo to the review queue.', unit: 'percent' },
    },
  },
  {
    title: 'Sign-in protection',
    icon: 'shield',
    keys: {
      otp_lock_max_fails: { label: 'Wrong codes before lock', help: 'Failed OTP attempts before the number is locked.' },
      otp_lock_minutes: { label: 'Lock duration', help: 'Minutes a number stays locked.', unit: 'minutes' },
    },
  },
  {
    title: 'Paid plans',
    icon: 'card',
    keys: {
      platform_fee_bps: { label: 'Platform fee', help: 'Hengout’s share of a paid seat, in basis points (1000 = 10%).', unit: 'bps' },
      plan_price_min_paise: { label: 'Lowest seat price', help: 'In paise (4900 = ₹49).', unit: 'paise' },
      plan_price_max_paise: { label: 'Highest seat price', help: 'In paise.', unit: 'paise' },
      seat_pay_hours: { label: 'Time to pay for a seat', help: 'Hours an approved member has to pay before the seat is released.', unit: 'hours' },
      refund_leave_hours: { label: 'Refund if leaving before', help: 'Members who leave at least this many hours before the start get their money back.', unit: 'hours' },
    },
  },
];

function pretty(val: string, unit?: Meta['unit']) {
  const n = Number(val);
  switch (unit) {
    case 'paise':
      return `${formatPaise(n)}`;
    case 'bps':
      return `${n / 100}%`;
    case 'percent':
      return `${n}%`;
    case 'hours':
      return `${val} h`;
    case 'minutes':
      return `${val} min`;
    case 'metres':
      return `${val} m`;
    case 'days':
      return `${val} days`;
    default:
      return val;
  }
}

/** Tunables read by the database and Edge Functions (private.settings). Changes apply immediately. */
export default async function Settings() {
  const { supabase } = await requireFullAdmin();
  const { data, error } = await supabase.from('admin_settings').select('key, val, updated_at').order('key');
  const rows = new Map((data ?? []).map((r) => [r.key ?? '', r]));
  const known = new Set(GROUPS.flatMap((g) => Object.keys(g.keys)));
  const other = (data ?? []).filter((r) => r.key && !known.has(r.key));

  const Row = ({ k, meta }: { k: string; meta: Meta }) => {
    const r = rows.get(k);
    if (!r) return null;
    return (
      <tr>
        <td>
          <div className="cell-main">
            <strong>{meta.label}</strong>
            <span className="muted">{meta.help}</span>
          </div>
        </td>
        <td className="num">
          <strong>{pretty(r.val ?? '', meta.unit)}</strong>
          <div className="muted small">{formatDateTime(r.updated_at)}</div>
        </td>
        <td className="actions">
          <ActionForm dialog={{ label: '', icon: 'edit', compact: true, title: meta.label, description: meta.help }} action={saveSetting} hidden={{ key: k }} buttons={[{ label: 'Save', tone: 'primary', icon: 'save' }]}>
            <label className="field">
              <span>
                Value <code>{k}</code>
              </span>
              <input name="val" defaultValue={r.val ?? ''} required maxLength={200} />
            </label>
          </ActionForm>
        </td>
      </tr>
    );
  };

  return (
    <Page title="App settings" icon="settings" subtitle="Limits and thresholds the app enforces. Changes apply at once and are recorded in the audit log.">
      <SettingsTabs current="settings" />
      <LoadError error={error} />
      {data?.length ? (
        <div className="grid2">
          {GROUPS.map((g) =>
            Object.keys(g.keys).some((k) => rows.has(k)) ? (
              <Card key={g.title} title={g.title} icon={g.icon} flush>
                <ClientTable pageSize={10} label="settings">
                  {Object.entries(g.keys)
                    .filter(([k]) => rows.has(k))
                    .map(([k, meta]) => (
                      <Row key={k} k={k} meta={meta} />
                    ))}
                </ClientTable>
              </Card>
            ) : null,
          )}
          {other.length ? (
            <Card title="Other" icon="settings" flush>
              <ClientTable pageSize={10} label="settings">
                {other.map((r) => (
                  <Row key={r.key} k={r.key!} meta={{ label: r.key!, help: 'No description yet.' }} />
                ))}
              </ClientTable>
            </Card>
          ) : null}
        </div>
      ) : (
        <Empty icon="settings">No settings found.</Empty>
      )}
    </Page>
  );
}
