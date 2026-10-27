import { redirect } from 'next/navigation';
import { getClaims } from '@/lib/auth';
import { MfaForm } from './MfaForm';

/** S-44: every admin session is TOTP-verified (aal2) before any console page loads. */
export default async function Mfa() {
  const { supabase, claims } = await getClaims();
  if (!claims.sub) redirect('/login');
  if (claims.aal === 'aal2') redirect('/queue');
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === 'verified');

  return (
    <div className="auth">
      <div className="card">
        <h1>Two-step check</h1>
        <p className="muted">
          {factor ? 'Enter the code from your authenticator app.' : 'Scan the code with an authenticator app, then enter the 6-digit code it shows.'}
        </p>
        <MfaForm factorId={factor?.id ?? null} />
      </div>
    </div>
  );
}
