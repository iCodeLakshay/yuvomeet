import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { unwrap } from '../../lib/errors';
import { qk, queryClient } from '../../lib/query';
import { supabase, type Tables } from '../../lib/supabase';
import { identify } from '../../lib/telemetry';
import { registerPushToken } from '../account/push';

export type SessionStatus = 'loading' | 'signed_out' | 'onboarding' | 'active' | 'restricted';

interface SessionValue {
  status: SessionStatus;
  userId: string | null;
  profile: Tables<'profiles'> | null;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

function statusOf(session: Session | null | undefined, profile: Tables<'profiles'> | null | undefined, loading: boolean): SessionStatus {
  if (session === undefined || (session && loading && !profile)) return 'loading';
  if (!session || !profile || profile.status === 'deleted') return 'signed_out';
  if (profile.status === 'onboarding') return 'onboarding';
  if (profile.status === 'active') return 'active';
  return 'restricted';
}

/** Auth session + own profile row. Drives the protected route groups in app/_layout. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const profileQuery = useQuery({
    queryKey: qk.me,
    enabled: Boolean(userId),
    queryFn: async (): Promise<Tables<'profiles'>> => unwrap(await supabase.from('profiles').select('*').eq('id', userId!).single()),
  });
  const profile = userId ? profileQuery.data : null;

  // Profile status can change server-side (suspension, verification): listen for it.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`profile:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: qk.me });
        void queryClient.invalidateQueries({ queryKey: qk.notifications });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    identify(userId);
    if (userId && profile?.status === 'active') void registerPushToken(userId);
  }, [userId, profile?.status]);

  const value = useMemo<SessionValue>(
    () => ({
      status: statusOf(session, profile, profileQuery.isLoading),
      userId,
      profile: profile ?? null,
      signOut: async () => {
        await supabase.auth.signOut();
        queryClient.clear();
      },
    }),
    [session, profile, profileQuery.isLoading, userId],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/** The signed-in profile. Only call from screens inside the authenticated groups. */
export function useMe(): Tables<'profiles'> {
  const { profile } = useSession();
  if (!profile) throw new Error('useMe called without a profile');
  return profile;
}

export const isVerified = (p: Tables<'profiles'>) => p.verification_status === 'verified';
