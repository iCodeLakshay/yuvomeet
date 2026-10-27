import { createServerClient } from '@supabase/ssr';
import type { Database } from '@yuvomeet/shared';
import { cookies } from 'next/headers';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Per-request client on the admin's own session; RLS and require_admin do the authorising. */
export async function serverClient() {
  const store = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server components cannot write cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

export type Db = Awaited<ReturnType<typeof serverClient>>;
