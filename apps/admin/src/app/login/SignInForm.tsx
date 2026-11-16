'use client';

import { useActionState, useEffect } from 'react';
import { toast } from '@/components/feedback';
import { Icon } from '@/components/Icon';
import { signIn } from './actions';

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, {});
  useEffect(() => {
    if (state.error) toast('error', 'Sign-in failed', state.error);
  }, [state]);
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
        <Icon name={pending ? 'refresh' : 'key'} className={pending ? 'spin' : undefined} />
        <span>Continue</span>
      </button>
    </form>
  );
}
