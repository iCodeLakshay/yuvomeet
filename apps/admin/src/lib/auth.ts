import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverClient } from './supabase';

export type AdminRole = 'reviewer' | 'admin';

interface Claims {
  sub?: string;
  app_role?: string;
  aal?: string;
  email?: string;
}

/** Verified JWT claims (getClaims checks the signature; the cookie alone is not trusted). */
export const getClaims = cache(async () => {
  const supabase = await serverClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, claims: (data?.claims ?? {}) as Claims };
});

/**
 * For /mfa and its actions: a signed-in account with no admin role must not enrol a TOTP factor or
 * stay signed in. It is signed out, so the check cannot be used to probe or to park a session.
 */
export async function requireStaffSession() {
  const { supabase, claims } = await getClaims();
  if (!claims.sub) redirect('/login');
  if (claims.app_role !== 'reviewer' && claims.app_role !== 'admin') {
    await supabase.auth.signOut();
    redirect('/login?error=not_admin');
  }
  return { supabase, claims };
}

/** S-43, S-44: console pages need an admin role claim and a TOTP-verified (aal2) session. */
export const requireAdmin = cache(async () => {
  const { supabase, claims } = await getClaims();
  if (!claims.sub) redirect('/login');
  if (claims.app_role !== 'reviewer' && claims.app_role !== 'admin') redirect('/login?error=not_admin');
  if (claims.aal !== 'aal2') redirect('/mfa');
  return { supabase, userId: claims.sub, role: claims.app_role as AdminRole, email: claims.email ?? '' };
});

/** Admin-only pages send reviewers back to the queue. The database refuses their writes regardless. */
export async function requireFullAdmin() {
  const session = await requireAdmin();
  if (session.role !== 'admin') redirect('/queue');
  return session;
}
