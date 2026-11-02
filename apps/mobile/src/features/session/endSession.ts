import * as SecureStore from 'expo-secure-store';
import { queryClient, queryPersister } from '../../lib/query';
import { storage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { resetOutboxes } from '../chat/api';
import { TRUSTED_CONTACT_KEY } from '../safety/api';

/**
 * Sign-out and account deletion: revoke the refresh token on the server (every device for
 * this user, the supabase-js default scope), then remove everything this user left on the
 * phone, so the next person to sign in sees nothing of theirs. The MMKV encryption key stays.
 */
export async function endSession() {
  try {
    await supabase.auth.signOut();
  } catch {
    // Offline: the server session expires with the 1 h JWT; still wipe locally.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }
  queryClient.clear();
  queryPersister.removeClient();
  resetOutboxes();
  storage.clearAll();
  await SecureStore.deleteItemAsync(TRUSTED_CONTACT_KEY).catch(() => undefined);
}
