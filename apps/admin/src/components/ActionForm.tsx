'use client';

import { useActionState, type ReactNode } from 'react';
import type { ActionState } from '@/lib/action';

export interface ActionButton {
  label: string;
  /** Sent as the "decision" field, so one form can carry approve / reject / escalate. */
  value?: string;
  tone?: 'primary' | 'secondary' | 'danger';
}

export interface ActionFormProps {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
  buttons: ActionButton[];
  /** Every admin action needs a reason (S-45); off only for forms with their own fields. */
  reason?: boolean | string;
  children?: ReactNode;
  confirm?: string;
  /** Folds the form behind a summary link (long lists of per-row actions). */
  collapsed?: string;
}

/** One form for every audited admin action: hidden ids, a required reason, decision buttons. */
export function ActionForm({ collapsed, ...props }: ActionFormProps) {
  if (!collapsed) return <Form {...props} />;
  return (
    <details className="fold">
      <summary>{collapsed}</summary>
      <Form {...props} />
    </details>
  );
}

function Form({ action, hidden = {}, buttons, reason = true, children, confirm }: Omit<ActionFormProps, 'collapsed'>) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className="stack"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      {reason ? (
        <label className="field">
          <span>{typeof reason === 'string' ? reason : 'Reason (recorded in the audit log)'}</span>
          <textarea name="reason" required minLength={3} rows={2} />
        </label>
      ) : null}
      <div className="row">
        {buttons.map((b) => (
          <button key={b.label} type="submit" name="decision" value={b.value ?? b.label} className={`btn ${b.tone ?? 'secondary'}`} disabled={pending}>
            {b.label}
          </button>
        ))}
        {state.error ? <span className="error" role="alert">{state.error}</span> : null}
        {state.ok ? <span className="ok">{state.ok}</span> : null}
      </div>
    </form>
  );
}
