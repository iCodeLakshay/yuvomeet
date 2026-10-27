/**
 * Supabase Client (S-2: Ships with anon key only, never service_role or vendor secrets)
 */

import { createClient } from '@supabase/supabase-js';
import { appStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://kota-mumbai.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-placeholder';

export const isLiveSupabaseConfigured =
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
  !supabaseUrl.includes('kota-mumbai.supabase.co');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key: string) => appStorage.getString(key) ?? null,
      setItem: (key: string, value: string) => appStorage.set(key, value),
      removeItem: (key: string) => appStorage.delete(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
