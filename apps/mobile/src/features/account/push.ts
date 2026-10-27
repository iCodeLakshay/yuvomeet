import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * Registers the Expo push token only if the user granted the notifications consent and the
 * OS permission. Tokens are owner-only rows (S-49); payloads carry ids, never content (S-48).
 */
export async function registerPushToken(userId: string) {
  if (!Device.isDevice) return;
  const { data: consent } = await supabase
    .from('consents')
    .select('granted')
    .eq('user_id', userId)
    .eq('purpose', 'notifications')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!consent?.granted) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.setNotificationChannelAsync('default', { name: 'Plans and chats', importance: Notifications.AndroidImportance.HIGH });
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await supabase.from('push_tokens').upsert({ user_id: userId, token, platform: 'android', last_seen_at: new Date().toISOString() });
}
