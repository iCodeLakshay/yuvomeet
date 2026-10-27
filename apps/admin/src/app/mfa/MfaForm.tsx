'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { enrollTotp, verifyTotp, type EnrollState } from './actions';

export function MfaForm({ factorId }: { factorId: string | null }) {
  const [state, action, pending] = useActionState(verifyTotp, {});
  const [enrol, setEnrol] = useState<EnrollState | null>(null);
  const [starting, startTransition] = useTransition();

  useEffect(() => {
    if (!factorId) startTransition(async () => setEnrol(await enrollTotp()));
  }, [factorId]);

  const id = factorId ?? enrol?.factorId;
  return (
    <form action={action} className="stack">
      {!factorId && enrol?.qr ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qr" src={enrol.qr} alt="Authenticator QR code" />
          <p className="muted">
            Can&apos;t scan? Key: <code>{enrol.secret}</code>
          </p>
        </>
      ) : null}
      {enrol?.error ? <p className="error">{enrol.error}</p> : null}
      <input type="hidden" name="factorId" value={id ?? ''} />
      <label className="field">
        <span>6-digit code</span>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus />
      </label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <button className="btn primary" disabled={pending || starting || !id}>
        Verify
      </button>
    </form>
  );
}
