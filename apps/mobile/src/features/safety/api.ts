import { useMutation, useQuery } from '@tanstack/react-query';
import { EMERGENCY_HELPLINE, getReportSeverity, type ReportReason } from '@yuvomeet/shared';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Linking, Share } from 'react-native';
import { unwrap } from '../../lib/errors';
import { formatPlanTime } from '../../lib/format';
import { qk, queryClient } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/telemetry';

type Context = 'profile' | 'plan' | 'message';

export interface ReportInput {
  targetUserId: string;
  reason: ReportReason;
  details: string;
  planId?: string;
  messageId?: string;
  context: Context;
  alsoBlock: boolean;
}

/** CH-4, VR-5. Never gated by entitlement (S-30). */
export function useReport() {
  return useMutation({
    mutationFn: async (input: ReportInput) => {
      unwrap(
        await supabase.rpc('submit_report', {
          p_target_user_id: input.targetUserId,
          p_reason: input.reason,
          p_details: input.details,
          p_plan_id: input.planId,
          p_message_id: input.messageId,
        }),
      );
      track('report_submitted', { reason: input.reason, severity: getReportSeverity(input.reason), context: input.context });
      if (input.alsoBlock) await block(input.targetUserId, input.context);
    },
  });
}

async function block(userId: string, context: Context) {
  unwrap(await supabase.rpc('block_user', { p_target_user_id: userId }));
  track('user_blocked', { context });
  // S-17: the blocked person disappears everywhere immediately.
  await queryClient.invalidateQueries();
}

export function useBlock() {
  return useMutation({ mutationFn: ({ userId, context }: { userId: string; context: Context }) => block(userId, context) });
}

export function useBlocks() {
  return useQuery({
    queryKey: qk.blocks,
    queryFn: async () => unwrap(await supabase.from('my_blocks').select('*').order('created_at', { ascending: false })),
  });
}

export function useUnblock() {
  return useMutation({
    mutationFn: async (userId: string) => unwrap(await supabase.from('blocks').delete().eq('blocked_id', userId)),
    onSettled: () => queryClient.invalidateQueries(),
  });
}

// -----------------------------------------------------------------------------
// Trusted contact (SF-2, S-50): stored only on this device, never sent to the server.
// -----------------------------------------------------------------------------
export interface TrustedContact {
  name: string;
  phone: string;
}

const CONTACT_KEY = 'yuvomeet.trusted-contact';

export function useTrustedContact() {
  return useQuery({
    queryKey: ['trusted-contact'],
    networkMode: 'always',
    gcTime: 0,
    queryFn: async () => {
      const raw = await SecureStore.getItemAsync(CONTACT_KEY);
      return raw ? (JSON.parse(raw) as TrustedContact) : null;
    },
  });
}

export async function saveTrustedContact(contact: TrustedContact | null) {
  if (contact) await SecureStore.setItemAsync(CONTACT_KEY, JSON.stringify(contact));
  else await SecureStore.deleteItemAsync(CONTACT_KEY);
  await queryClient.invalidateQueries({ queryKey: ['trusted-contact'] });
}

interface SharePlan {
  title: string;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  hostName: string;
  venueLat: number;
  venueLng: number;
}

/** Opens WhatsApp to the trusted contact, falling back to the share sheet. */
async function openWhatsApp(text: string, contact: TrustedContact | null) {
  const phone = contact?.phone.replace(/\D/g, '').slice(-10);
  const url = `whatsapp://send?${phone ? `phone=91${phone}&` : ''}text=${encodeURIComponent(text)}`;
  if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  else await Share.share({ message: text });
}

export function sharePlanWithContact(plan: SharePlan, contact: TrustedContact | null) {
  const map = `https://maps.google.com/?q=${plan.venueLat},${plan.venueLng}`;
  return openWhatsApp(
    `I'm going to a Yuvomeet group plan.\n${plan.title}\n${plan.venueName}, ${plan.venueAddress}\n${formatPlanTime(plan.startsAt)}\nHost: ${plan.hostName}\n${map}`,
    contact,
  );
}

/**
 * SF-3, S-51: one GPS fix composed on the device into the WhatsApp message. The server only
 * learns that SOS was pressed for this plan, never the location.
 */
export async function sendSosLocation(plan: SharePlan & { id: string }, contact: TrustedContact | null) {
  let locationLine = 'Location unavailable.';
  let locationSent = false;
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.granted) {
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    locationLine = `My location: https://maps.google.com/?q=${fix.coords.latitude.toFixed(6)},${fix.coords.longitude.toFixed(6)}`;
    locationSent = true;
  }
  await supabase.rpc('log_sos', { p_plan_id: plan.id });
  track('sos_pressed', { plan_id: plan.id, location_sent: locationSent });
  await openWhatsApp(`SOS from Yuvomeet. I need help.\n${locationLine}\nPlan: ${plan.title} at ${plan.venueName}, ${plan.venueAddress}`, contact);
}

export const callEmergency = () => Linking.openURL(`tel:${EMERGENCY_HELPLINE}`);
