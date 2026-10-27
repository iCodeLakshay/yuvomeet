'use server';

import type { Database } from '@yuvomeet/shared';
import { field, runAdmin, type ActionState } from '@/lib/action';

type Enums = Database['public']['Enums'];

// Every action maps to one audited RPC; the database enforces reviewer vs admin (S-43, S-45).

export async function claimItem(_: ActionState, form: FormData) {
  const id = field(form, 'item_id');
  return runAdmin((db) => db.rpc('admin_claim_item', { p_item_id: id }), ['/queue', `/queue/${id}`], 'Claimed');
}

export async function decideItem(_: ActionState, form: FormData) {
  const id = field(form, 'item_id');
  return runAdmin(
    (db) => db.rpc('admin_decide_item', { p_item_id: id, p_decision: field(form, 'decision'), p_reason: field(form, 'reason') }),
    ['/queue', `/queue/${id}`],
    'Decision saved',
  );
}

export async function setUserStatus(_: ActionState, form: FormData) {
  const id = field(form, 'user_id');
  return runAdmin(
    (db) => db.rpc('admin_set_user_status', { p_user_id: id, p_status: field(form, 'decision') as Enums['profile_status'], p_reason: field(form, 'reason') }),
    [`/users/${id}`],
  );
}

export async function setGender(_: ActionState, form: FormData) {
  const id = field(form, 'user_id');
  return runAdmin(
    (db) => db.rpc('admin_set_gender', { p_user_id: id, p_gender: field(form, 'gender') as Enums['gender'], p_reason: field(form, 'reason') }),
    [`/users/${id}`],
  );
}

export async function setRole(_: ActionState, form: FormData) {
  const id = field(form, 'user_id');
  const role = field(form, 'role');
  return runAdmin((db) => db.rpc('admin_set_role', { p_user_id: id, p_role: (role || null) as string, p_reason: field(form, 'reason') }), [`/users/${id}`]);
}

export async function cancelPlan(_: ActionState, form: FormData) {
  const id = field(form, 'plan_id');
  return runAdmin((db) => db.rpc('admin_cancel_plan', { p_plan_id: id, p_reason: field(form, 'reason') }), [`/plans/${id}`], 'Plan cancelled');
}

export async function removeMember(_: ActionState, form: FormData) {
  const id = field(form, 'plan_id');
  return runAdmin(
    (db) => db.rpc('admin_remove_member', { p_plan_id: id, p_user_id: field(form, 'user_id'), p_reason: field(form, 'reason') }),
    [`/plans/${id}`],
    'Removed',
  );
}

export async function muteMember(_: ActionState, form: FormData) {
  return runAdmin(
    (db) => db.rpc('admin_mute', { p_conversation_id: field(form, 'conversation_id'), p_user_id: field(form, 'user_id'), p_reason: field(form, 'reason') }),
    [`/plans/${field(form, 'plan_id')}`],
    'Muted',
  );
}

export async function removeMessage(_: ActionState, form: FormData) {
  return runAdmin(
    (db) => db.rpc('admin_remove_message', { p_message_id: field(form, 'message_id'), p_reason: field(form, 'reason') }),
    [`/plans/${field(form, 'plan_id')}`, `/queue/${field(form, 'item_id')}`],
    'Message removed',
  );
}

export async function decideAppeal(_: ActionState, form: FormData) {
  return runAdmin(
    (db) => db.rpc('admin_decide_appeal', { p_appeal_id: field(form, 'appeal_id'), p_uphold: field(form, 'decision') === 'uphold', p_response: field(form, 'reason') }),
    ['/appeals'],
    'Answer sent',
  );
}

export async function saveVenue(_: ActionState, form: FormData): Promise<ActionState> {
  const num = (k: string) => Number(field(form, k));
  const id = field(form, 'venue_id');
  if (!Number.isFinite(num('lat')) || !Number.isFinite(num('lng'))) return { error: 'Latitude and longitude must be numbers.' };
  return runAdmin(
    (db) =>
      db.rpc('admin_save_venue', {
        p_id: (id || null) as string,
        p_city_id: field(form, 'city_id'),
        p_name: field(form, 'name'),
        p_area_name: field(form, 'area_name'),
        p_area_cell: field(form, 'area_cell'),
        p_lat: num('lat'),
        p_lng: num('lng'),
        p_address_line: field(form, 'address_line'),
        p_hours: { all: { open: field(form, 'open'), close: field(form, 'close') } },
        p_capacity: num('capacity'),
        p_partner: form.get('partner') === 'on',
        p_late_events_allowed: form.get('late_events_allowed') === 'on',
        p_reason: field(form, 'reason'),
      }),
    ['/venues', `/venues/${id || 'new'}`],
  );
}

export async function setVenueStatus(_: ActionState, form: FormData) {
  const id = field(form, 'venue_id');
  return runAdmin(
    (db) => db.rpc('admin_set_venue_status', { p_venue_id: id, p_status: field(form, 'decision') as Enums['venue_status'], p_reason: field(form, 'reason') }),
    ['/venues', `/venues/${id}`],
  );
}

export async function setCityStatus(_: ActionState, form: FormData) {
  return runAdmin(
    (db) => db.rpc('admin_set_city_status', { p_city_id: field(form, 'city_id'), p_status: field(form, 'decision') as Enums['city_status'], p_reason: field(form, 'reason') }),
    ['/cities'],
  );
}
