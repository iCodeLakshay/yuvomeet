import { SignInForm } from './SignInForm';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="auth">
      <div className="card">
        <h1>Yuvomeet Admin</h1>
        <p className="muted">Reviewers and admins only. You will confirm with your authenticator app next.</p>
        {error === 'not_admin' ? <p className="error">This account has no admin role.</p> : null}
        <SignInForm />
      </div>
    </div>
  );
}
