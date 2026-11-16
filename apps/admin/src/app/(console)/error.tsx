'use client';

import { useEffect } from 'react';

/** A page failed to load. The message is generic on purpose: details go to Sentry, not the screen. */
export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('console page error', error.digest ?? '');
  }, [error]);
  return (
    <section className="page">
      <div className="card stack" role="alert">
        <h1>This page did not load</h1>
        <p className="muted">Nothing was changed. Try again, and tell an admin if it keeps happening{error.digest ? ` (reference ${error.digest})` : ''}.</p>
        <div className="row">
          <button className="btn primary" onClick={reset}>Try again</button>
        </div>
      </div>
    </section>
  );
}
