'use server';

import type { Database } from '@hengout/shared';
import { redirect } from 'next/navigation';
import { field, runAdmin, type ActionState } from '@/lib/action';
import { requireAdmin } from '@/lib/auth';
import { firstInvalid, int, num, oneOf, optionalUuid, reason, text, uuid } from '@/lib/validate';

type Enums = Database['public']['Enums'];

// Console actions for 20261117000001_admin_console.sql. Same contract as actions.ts: validate the
// input here, call one audited RPC, let the database decide who may do what.

const NOT_VALID = { error: 'That request was not valid. Reload the page and try again.' };

// ---------------------------------------------------------------- settings and content filter

export async function saveSetting(_: ActionState, form: FormData): Promise<ActionState> {
  const key = text(form, 'key', 'Setting', 1, 60);
  const val = text(form, 'val', 'Value', 1, 200);
  const why = reason(form);
  const err = firstInvalid(key, val, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_set_setting', { p_key: key as string, p_val: val as string, p_reason: why as string }), ['/settings']);
}

export async function saveScreenTerm(_: ActionState, form: FormData): Promise<ActionState> {
  const term = text(form, 'term', 'Term', 2, 60);
  const lang = text(form, 'lang', 'Language', 2, 12);
  const action = oneOf(form, 'action', ['reject', 'hold'] as const);
  const why = reason(form);
  const err = firstInvalid(term, lang, action, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_save_screen_term', { p_term: term as string, p_lang: lang as string, p_action: action as string, p_reason: why as string }),
    ['/settings/filters'],
  );
}

export async function deleteScreenTerm(_: ActionState, form: FormData): Promise<ActionState> {
  const term = text(form, 'term', 'Term', 1, 60);
  const lang = text(form, 'lang', 'Language', 1, 12);
  const why = reason(form);
  const err = firstInvalid(term, lang, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_delete_screen_term', { p_term: term as string, p_lang: lang as string, p_reason: why as string }), ['/settings/filters'], 'Deleted');
}

// ---------------------------------------------------------------- cities

export async function saveCity(_: ActionState, form: FormData): Promise<ActionState> {
  const id = optionalUuid(form, 'city_id');
  const name = text(form, 'name', 'Name', 2, 60);
  const slug = text(form, 'slug', 'Slug', 2, 40);
  const tz = text(form, 'timezone', 'Time zone', 3, 60);
  const lat = num(form, 'center_lat', 'Latitude', -90, 90);
  const lng = num(form, 'center_lng', 'Longitude', -180, 180);
  const why = reason(form);
  const err = firstInvalid(id, name, slug, tz, lat, lng, why);
  if (err) return err;
  return runAdmin(
    (db) =>
      db.rpc('admin_save_city', {
        p_id: id as string | null,
        p_name: name as string,
        p_slug: slug as string,
        p_timezone: tz as string,
        p_center_lat: lat as number,
        p_center_lng: lng as number,
        p_reason: why as string,
      }),
    ['/cities', '/colleges', '/venues'],
    id ? 'City saved' : 'City created',
  );
}

export async function deleteCity(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'city_id');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_delete_city', { p_city_id: id as string, p_reason: why as string }), ['/cities'], 'City deleted');
}

// ---------------------------------------------------------------- colleges

export async function saveCollege(_: ActionState, form: FormData): Promise<ActionState> {
  const id = optionalUuid(form, 'college_id');
  const city = uuid(form, 'city_id');
  const name = text(form, 'name', 'Name', 2, 120);
  const why = reason(form);
  const err = firstInvalid(id, city, name, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_save_college', { p_id: id as string | null, p_city_id: city as string, p_name: name as string, p_reason: why as string }),
    ['/colleges'],
    id ? 'College saved' : 'College added',
  );
}

export async function setCollegeStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'college_id');
  const status = oneOf(form, 'decision', ['active', 'hidden'] as const);
  const why = reason(form);
  const err = firstInvalid(id, status, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_set_college_status', { p_college_id: id as string, p_status: status as string, p_reason: why as string }), ['/colleges']);
}

export async function mergeCollege(_: ActionState, form: FormData): Promise<ActionState> {
  const from = uuid(form, 'college_id');
  const into = uuid(form, 'into_id');
  const why = reason(form);
  const err = firstInvalid(from, into, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_merge_college', { p_from: from as string, p_into: into as string, p_reason: why as string }), ['/colleges'], 'Merged');
}

export async function deleteCollege(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'college_id');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_delete_college', { p_college_id: id as string, p_reason: why as string }), ['/colleges'], 'Deleted');
}

// ---------------------------------------------------------------- interests and activities

const SLUG = /^[a-z0-9]+(_[a-z0-9]+)*$/;

async function saveCatalog(kind: 'interest' | 'activity', form: FormData): Promise<ActionState> {
  const slug = text(form, 'slug', 'Key', 2, 40);
  const label = text(form, 'label', 'Label', 2, 40);
  const icon = text(form, 'icon', 'Icon', 1, 40);
  const sort = int(form, 'sort', 'Order', 0, 1000);
  const why = reason(form);
  const err = firstInvalid(slug, label, icon, sort, why);
  if (err) return err;
  if (!SLUG.test(slug as string)) return { error: 'The key uses lowercase letters, digits and underscores, like board_games.' };
  const args = { p_slug: slug as string, p_label: label as string, p_icon: icon as string, p_sort: sort as number, p_reason: why as string };
  return runAdmin((db) => (kind === 'interest' ? db.rpc('admin_save_interest', args) : db.rpc('admin_save_activity', args)), ['/catalog']);
}

export async function saveInterest(_: ActionState, form: FormData) {
  return saveCatalog('interest', form);
}

export async function saveActivity(_: ActionState, form: FormData) {
  return saveCatalog('activity', form);
}

export async function deleteInterest(_: ActionState, form: FormData): Promise<ActionState> {
  const slug = text(form, 'slug', 'Key', 1, 40);
  const why = reason(form);
  const err = firstInvalid(slug, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_delete_interest', { p_slug: slug as string, p_reason: why as string }),
    ['/catalog'],
    (n) => `Deleted. Removed from ${n ?? 0} profile${n === 1 ? '' : 's'}.`,
  );
}

export async function deleteActivity(_: ActionState, form: FormData): Promise<ActionState> {
  const slug = text(form, 'slug', 'Key', 1, 40);
  const why = reason(form);
  const err = firstInvalid(slug, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_delete_activity', { p_slug: slug as string, p_reason: why as string }), ['/catalog'], 'Deleted');
}

// ---------------------------------------------------------------- venues

export async function deleteVenue(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'venue_id');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  const res = await runAdmin((db) => db.rpc('admin_delete_venue', { p_venue_id: id as string, p_reason: why as string }), ['/venues'], 'Deleted');
  if (res.ok) redirect('/venues?toast=venue_deleted');
  return res;
}

// ---------------------------------------------------------------- members

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'user_id');
  const name = text(form, 'first_name', 'First name', 1, 30);
  const bio = text(form, 'bio', 'Bio', 0, 300, true);
  const bioStatus = oneOf(form, 'bio_status', ['visible', 'held', 'rejected'] as const);
  const city = optionalUuid(form, 'city_id');
  const college = optionalUuid(form, 'college_id');
  const why = reason(form);
  const err = firstInvalid(id, name, bio, bioStatus, city, college, why);
  if (err) return err;
  return runAdmin(
    (db) =>
      db.rpc('admin_update_profile', {
        p_user_id: id as string,
        p_first_name: name as string,
        p_bio: bio as string | null,
        p_bio_status: bioStatus as Enums['content_status'],
        p_city_id: city as string | null,
        p_college_id: college as string | null,
        p_reason: why as string,
      }),
    [`/users/${id as string}`, '/users'],
    'Profile saved',
  );
}

export async function setEntitlement(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'user_id');
  const tier = oneOf(form, 'tier', ['free', 'plus', 'premium'] as const);
  const why = reason(form);
  const err = firstInvalid(id, tier, why);
  if (err) return err;
  const until = field(form, 'until');
  let iso: string | null = null;
  if (tier !== 'free') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return { error: 'Choose an end date.' };
    // The pass runs to the end of that day in India.
    iso = new Date(`${until}T23:59:59+05:30`).toISOString();
  }
  return runAdmin(
    (db) => db.rpc('admin_set_entitlement', { p_user_id: id as string, p_tier: tier as Enums['entitlement'], p_until: iso, p_reason: why as string }),
    [`/users/${id as string}`],
    'Plan updated',
  );
}

export async function deleteUser(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'user_id');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  if (field(form, 'confirm_text') !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  return runAdmin((db) => db.rpc('admin_delete_user', { p_user_id: id as string, p_reason: why as string }), [`/users/${id as string}`, '/users'], 'Deletion started. Data is purged in 30 days.');
}

export async function setPhotoStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const user = uuid(form, 'user_id');
  const photo = uuid(form, 'photo_id');
  const status = oneOf(form, 'decision', ['approved', 'rejected'] as const);
  const why = reason(form);
  const err = firstInvalid(user, photo, status, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_set_photo_status', { p_photo_id: photo as string, p_status: status as Enums['media_status'], p_reason: why as string }),
    [`/users/${user as string}`],
    status === 'approved' ? 'Photo restored' : 'Photo taken down',
  );
}

export async function grantKycAttempt(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'user_id');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_grant_kyc_attempt', { p_user_id: id as string, p_reason: why as string }), [`/users/${id as string}`], 'Extra attempt granted');
}

/** Email lookup for support: jumps straight to the member's record. */
export async function findUserByEmail(_: ActionState, form: FormData): Promise<ActionState> {
  const email = text(form, 'email', 'Email', 5, 254);
  if (typeof email !== 'string') return email;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc('admin_find_user_by_email', { p_email: email });
  if (error) return { error: error.code === '42501' ? error.message : 'The lookup did not work. Try again.' };
  if (!data) return { error: 'No account uses that email.' };
  redirect(`/users/${data}`);
}

// ---------------------------------------------------------------- reports, queue, chat

export async function setReportStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'report_id');
  const status = oneOf(form, 'decision', ['open', 'actioned', 'dismissed'] as const);
  const why = reason(form);
  const err = firstInvalid(id, status, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_set_report_status', { p_report_id: id as string, p_status: status as Enums['report_status'], p_reason: why as string }),
    ['/reports', '/queue', '/'],
  );
}

export async function releaseItem(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'item_id');
  if (typeof id !== 'string') return id;
  return runAdmin((db) => db.rpc('admin_release_item', { p_item_id: id }), ['/queue', `/queue/${id}`], 'Released to the queue');
}

export async function restoreMessage(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'message_id');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  const paths = ['/messages'];
  const plan = field(form, 'plan_id');
  if (plan) paths.push(`/plans/${plan}`);
  return runAdmin((db) => db.rpc('admin_restore_message', { p_message_id: id as string, p_reason: why as string }), paths, 'Message restored');
}

export async function unmuteMember(_: ActionState, form: FormData): Promise<ActionState> {
  const plan = uuid(form, 'plan_id');
  const conversation = uuid(form, 'conversation_id');
  const user = uuid(form, 'user_id');
  const why = reason(form);
  const err = firstInvalid(plan, conversation, user, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_unmute', { p_conversation_id: conversation as string, p_user_id: user as string, p_reason: why as string }),
    [`/plans/${plan as string}`],
    'Unmuted',
  );
}

export async function setConversationStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const plan = uuid(form, 'plan_id');
  const conversation = uuid(form, 'conversation_id');
  const status = oneOf(form, 'decision', ['open', 'closed'] as const);
  const why = reason(form);
  const err = firstInvalid(plan, conversation, status, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_set_conversation_status', { p_conversation_id: conversation as string, p_status: status as Enums['conversation_status'], p_reason: why as string }),
    [`/plans/${plan as string}`],
    status === 'open' ? 'Chat reopened' : 'Chat closed',
  );
}

export async function updatePlan(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'plan_id');
  const title = text(form, 'title', 'Title', 3, 60);
  const description = text(form, 'description', 'Description', 0, 500, true);
  const why = reason(form);
  const err = firstInvalid(id, title, description, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_update_plan', { p_plan_id: id as string, p_title: title as string, p_description: description as string | null, p_reason: why as string }),
    [`/plans/${id as string}`, '/plans'],
    'Plan saved',
  );
}

// ---------------------------------------------------------------- money

export async function refundPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'payment_id');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_refund_payment', { p_payment_id: id as string, p_reason: why as string }), ['/payments', '/'], 'Refund queued');
}

export async function recordPayout(_: ActionState, form: FormData): Promise<ActionState> {
  const host = uuid(form, 'host_id');
  const rupees = num(form, 'amount', 'Amount', 0.01, 100_000);
  const ref = text(form, 'reference', 'Reference', 4, 80);
  const why = reason(form);
  const err = firstInvalid(host, rupees, ref, why);
  if (err) return err;
  const paise = Math.round((rupees as number) * 100);
  return runAdmin(
    (db) => db.rpc('admin_record_payout', { p_host_id: host as string, p_amount_paise: paise, p_reference: ref as string, p_reason: why as string }),
    ['/payouts', `/users/${host as string}`],
    'Payout recorded',
  );
}

// ---------------------------------------------------------------- announcements

export async function sendNotification(_: ActionState, form: FormData): Promise<ActionState> {
  const audience = oneOf(form, 'audience', ['all', 'city', 'user'] as const);
  const title = text(form, 'title', 'Title', 3, 60);
  const body = text(form, 'body', 'Message', 3, 240);
  const why = reason(form);
  const err = firstInvalid(audience, title, body, why);
  if (err) return err;
  const city = audience === 'city' ? uuid(form, 'city_id') : null;
  const user = audience === 'user' ? uuid(form, 'user_id') : null;
  const err2 = firstInvalid(city, user);
  if (err2) return audience === 'user' ? { error: 'Paste the member’s user id.' } : err2;
  return runAdmin(
    (db) => db.rpc('admin_send_notification', { p_user_id: user as string | null, p_city_id: city as string | null, p_title: title as string, p_body: body as string, p_reason: why as string }),
    ['/announcements'],
    (n) => `Sent to ${n ?? 0} member${n === 1 ? '' : 's'}.`,
  );
}

// ---------------------------------------------------------------- staff

export async function addStaff(_: ActionState, form: FormData): Promise<ActionState> {
  const email = text(form, 'email', 'Email', 5, 254);
  const role = oneOf(form, 'role', ['reviewer', 'admin'] as const);
  const why = reason(form);
  const err = firstInvalid(email, role, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_set_role_by_email', { p_email: email as string, p_role: role as string, p_reason: why as string }), ['/staff'], 'Access granted');
}

export async function changeStaffRole(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'user_id');
  const role = oneOf(form, 'decision', ['reviewer', 'admin', 'none'] as const);
  const why = reason(form);
  const err = firstInvalid(id, role, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_set_role', { p_user_id: id as string, p_role: (role === 'none' ? null : role) as string, p_reason: why as string }),
    ['/staff', `/users/${id as string}`],
    role === 'none' ? 'Access removed' : 'Role changed',
  );
}

// ---------------------------------------------------------------- web waitlist

export async function deleteWebWaitlist(_: ActionState, form: FormData): Promise<ActionState> {
  const id = int(form, 'entry_id', 'Entry', 1, Number.MAX_SAFE_INTEGER);
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return typeof id === 'number' ? err : NOT_VALID;
  return runAdmin((db) => db.rpc('admin_delete_web_waitlist', { p_id: id as number, p_reason: why as string }), ['/waitlist'], 'Removed');
}
