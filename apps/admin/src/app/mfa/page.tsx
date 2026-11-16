import { redirect } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { Logo } from '@/components/Mark';
import { requireStaffSession } from '@/lib/auth';
import { MfaForm } from './MfaForm';

/** S-44: every admin session is TOTP-verified (aal2) before any console page loads. */
export default async function Mfa() {
  const { supabase, claims } = await requireStaffSession();
  if (claims.aal === 'aal2') redirect('/');
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === 'verified');

  return (
    <div className="auth">
      <main className="auth-box">
        <div className="auth-logo">
          <Logo height={44} />
        </div>
        <div className="card">
        <h1 className="brandline">
          <Brand name="googleAuthenticator" size={22} /> Two-step check
        </h1>
        <p className="muted">
          {factor ? 'Enter the code from your authenticator app.' : 'Scan the code with an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows.'}
        </p>
        <MfaForm factorId={factor?.id ?? null} />
        </div>
      </main>
    </div>
  );
}
