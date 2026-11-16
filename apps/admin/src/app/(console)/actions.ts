'use server';

import type { Database } from '@yuvomeet/shared';
import { field, runAdmin, type ActionState } from '@/lib/action';
import { firstInvalid, oneOf, reason, uuid } from '@/lib/validate';

type Enums = Database['public']['Enums'];

// Every action maps to one audited RPC; the database enforces reviewer vs admin (S-43, S-45).
// Each action validates its input first (uuids, enums, reason length), so malformed requests are
// refused here with a clear message and the RPC only ever sees well-formed arguments.

export async function claimItem(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'item_id');
  if (typeof id !== 'string') return id;
  return runAdmin((db) => db.rpc('admin_claim_item', { p_item_id: id }), ['/queue', `/queue/${id}`], 'Claimed');
}

export async function decideItem(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'item_id');
  const decision = oneOf(form, 'decision', ['approve', 'reject', 'escalate'] as const);
  const why = reason(form);
  const err = firstInvalid(id, decision, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_decide_item', { p_item_id: id as string, p_decision: decision as string, p_reason: why as string }),
    ['/queue', `/queue/${id as string}`],
    'Decision saved',
  );
}

export async function setUserStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'user_id');
  const status = oneOf(form, 'decision', ['active', 'suspended', 'banned'] as const);
  const why = reason(form);
  const err = firstInvalid(id, status, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_set_user_status', { p_user_id: id as string, p_status: status as Enums['profile_status'], p_reason: why as string }),
    [`/users/${id as string}`],
  );
}

export async function setGender(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'user_id');
  const gender = oneOf(form, 'gender', ['woman', 'man', 'other'] as const);
  const why = reason(form);
  const err = firstInvalid(id, gender, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_set_gender', { p_user_id: id as string, p_gender: gender as Enums['gender'], p_reason: why as string }),
    [`/users/${id as string}`],
  );
}

export async function setRole(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'user_id');
  const role = field(form, 'role');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  if (role !== '' && role !== 'reviewer' && role !== 'admin') return { error: 'That request was not valid. Reload the page and try again.' };
  return runAdmin(
    (db) => db.rpc('admin_set_role', { p_user_id: id as string, p_role: (role || null) as string, p_reason: why as string }),
    [`/users/${id as string}`],
  );
}

export async function cancelPlan(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'plan_id');
  const why = reason(form);
  const err = firstInvalid(id, why);
  if (err) return err;
  return runAdmin((db) => db.rpc('admin_cancel_plan', { p_plan_id: id as string, p_reason: why as string }), [`/plans/${id as string}`], 'Plan cancelled');
}

export async function removeMember(_: ActionState, form: FormData): Promise<ActionState> {
  const plan = uuid(form, 'plan_id');
  const user = uuid(form, 'user_id');
  const why = reason(form);
  const err = firstInvalid(plan, user, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_remove_member', { p_plan_id: plan as string, p_user_id: user as string, p_reason: why as string }),
    [`/plans/${plan as string}`],
    'Removed',
  );
}

export async function muteMember(_: ActionState, form: FormData): Promise<ActionState> {
  const plan = uuid(form, 'plan_id');
  const conversation = uuid(form, 'conversation_id');
  const user = uuid(form, 'user_id');
  const why = reason(form);
  const err = firstInvalid(plan, conversation, user, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_mute', { p_conversation_id: conversation as string, p_user_id: user as string, p_reason: why as string }),
    [`/plans/${plan as string}`],
    'Muted',
  );
}

export async function removeMessage(_: ActionState, form: FormData): Promise<ActionState> {
  // Direct (pair) chats have no plan, so the plan id is optional here.
  const plan = field(form, 'plan_id') ? uuid(form, 'plan_id') : null;
  const message = uuid(form, 'message_id');
  const why = reason(form);
  const err = firstInvalid(plan, message, why);
  if (err) return err;
  const paths = ['/messages', ...(plan ? [`/plans/${plan as string}`] : [])];
  // item_id is only present when the message was opened from a queue item.
  if (field(form, 'item_id')) {
    const item = uuid(form, 'item_id');
    if (typeof item !== 'string') return item;
    paths.push(`/queue/${item}`);
  }
  return runAdmin((db) => db.rpc('admin_remove_message', { p_message_id: message as string, p_reason: why as string }), paths, 'Message removed');
}

export async function decideAppeal(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'appeal_id');
  const decision = oneOf(form, 'decision', ['uphold', 'deny'] as const);
  const why = reason(form);
  const err = firstInvalid(id, decision, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_decide_appeal', { p_appeal_id: id as string, p_uphold: decision === 'uphold', p_response: why as string }),
    ['/appeals'],
    'Answer sent',
  );
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const VENUE_TEXT = [
  ['name', 'Name', 120],
  ['area_name', 'Area', 80],
  ['area_cell', 'Area cell', 40],
  ['address_line', 'Address', 200],
] as const;

export async function saveVenue(_: ActionState, form: FormData): Promise<ActionState> {
  const id = field(form, 'venue_id') ? uuid(form, 'venue_id') : null;
  const city = uuid(form, 'city_id');
  const why = reason(form);
  const err = firstInvalid(id, city, why);
  if (err) return err;

  const lat = Number(field(form, 'lat'));
  const lng = Number(field(form, 'lng'));
  const capacity = Number(field(form, 'capacity'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'Latitude and longitude must be numbers.' };
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { error: 'Latitude and longitude are out of range.' };
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) return { error: 'Capacity must be a whole number from 1 to 1000.' };
  const open = field(form, 'open');
  const close = field(form, 'close');
  if (!HHMM.test(open) || !HHMM.test(close)) return { error: 'Opening and closing times must look like 09:00.' };
  for (const [key, label, max] of VENUE_TEXT) {
    const v = field(form, key);
    if (!v) return { error: `${label} is required.` };
    if (v.length > max) return { error: `${label} must be under ${max} characters.` };
  }

  const venueId = typeof id === 'string' ? id : null;
  return runAdmin(
    (db) =>
      db.rpc('admin_save_venue', {
        p_id: venueId as string,
        p_city_id: city as string,
        p_name: field(form, 'name'),
        p_area_name: field(form, 'area_name'),
        p_area_cell: field(form, 'area_cell'),
        p_lat: lat,
        p_lng: lng,
        p_address_line: field(form, 'address_line'),
        p_hours: { all: { open, close } },
        p_capacity: capacity,
        p_partner: form.get('partner') === 'on',
        p_late_events_allowed: form.get('late_events_allowed') === 'on',
        p_reason: why as string,
      }),
    ['/venues', `/venues/${venueId ?? 'new'}`],
  );
}

export async function setVenueStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'venue_id');
  const status = oneOf(form, 'decision', ['draft', 'approved', 'archived'] as const);
  const why = reason(form);
  const err = firstInvalid(id, status, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_set_venue_status', { p_venue_id: id as string, p_status: status as Enums['venue_status'], p_reason: why as string }),
    ['/venues', `/venues/${id as string}`],
  );
}

export async function setCityStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const id = uuid(form, 'city_id');
  const status = oneOf(form, 'decision', ['waitlist', 'beta', 'live'] as const);
  const why = reason(form);
  const err = firstInvalid(id, status, why);
  if (err) return err;
  return runAdmin(
    (db) => db.rpc('admin_set_city_status', { p_city_id: id as string, p_status: status as Enums['city_status'], p_reason: why as string }),
    ['/cities'],
  );
}
