import { createClient } from '@supabase/supabase-js';
import type { Database } from '@yuvomeet/shared';
import { AppState } from 'react-native';
import { env } from './env';
import { kv } from './storage';

/** Anon key only (S-2); every read and write goes through RLS. */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: kv,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE: Google sign-in returns a one-time code to the app's redirect URL.
    flowType: 'pkce',
  },
});

// Refresh tokens only while the app is in the foreground (supabase-js guidance for RN).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
