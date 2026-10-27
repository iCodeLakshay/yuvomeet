'use client';

import { useActionState } from 'react';
import { signIn } from './actions';

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <button className="btn primary" disabled={pending}>
        Continue
      </button>
    </form>
  );
}
