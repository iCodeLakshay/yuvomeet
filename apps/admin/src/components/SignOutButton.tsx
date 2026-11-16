'use client';

import { useTransition } from 'react';
import { signOut } from '@/app/login/actions';
import { confirmAction } from './feedback';
import { Icon } from './Icon';

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn ghost icon"
      aria-label="Sign out"
      title="Sign out"
      disabled={pending}
      onClick={async () => {
        const ok = await confirmAction({ title: 'Sign out?', body: 'You will need your password and authenticator code to come back.', confirmLabel: 'Sign out', tone: 'danger', icon: 'logout' });
        if (ok) start(() => signOut());
      }}
    >
      <Icon name={pending ? 'refresh' : 'logout'} className={pending ? 'spin' : undefined} />
    </button>
  );
}
