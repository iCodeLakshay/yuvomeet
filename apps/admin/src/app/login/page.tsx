import { Logo } from '@/components/Mark';
import { SignInForm } from './SignInForm';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="auth">
      <main className="auth-box">
        <div className="auth-logo">
          <Logo height={44} />
        </div>
        <div className="card">
          <h1>Sign in to the console</h1>
          <p className="muted">Reviewers and admins only. You will confirm with your authenticator app next.</p>
          {error === 'not_admin' ? <p className="error" role="alert">This account has no admin role.</p> : null}
          <SignInForm />
        </div>
      </main>
    </div>
  );
}
