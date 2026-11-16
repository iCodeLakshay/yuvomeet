'use client';

import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ActionState } from '@/lib/action';
import { confirmAction, toast } from './feedback';
import { Icon, type IconName } from './Icon';

export interface ActionButton {
  label: string;
  /** Sent as the "decision" field, so one form can carry approve / reject / escalate. */
  value?: string;
  tone?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: IconName;
}

export interface ActionFormProps {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
  buttons: ActionButton[];
  /** Every admin action needs a reason (S-45); off only for forms with their own fields. */
  reason?: boolean | string;
  children?: ReactNode;
  /** Asks before submitting. Buttons with the danger tone always ask, with this text or a default. */
  confirm?: string;
  /** Folds the form behind a summary link (long lists of per-row actions). */
  collapsed?: string;
  /** Opens the form in a modal instead: the trigger button's label, icon and tone. */
  dialog?: { label: string; icon?: IconName; tone?: ActionButton['tone']; title?: string; description?: string; compact?: boolean };
}

/** One form for every audited admin action: hidden ids, a required reason, decision buttons. */
export function ActionForm({ collapsed, dialog, ...props }: ActionFormProps) {
  if (dialog) return <DialogForm dialog={dialog} {...props} />;
  if (!collapsed) return <Form {...props} />;
  return (
    <details className="fold">
      <summary>{collapsed}</summary>
      <Form {...props} />
    </details>
  );
}

/**
 * The modal is only in the DOM while open, so its fields can never show up inline on the page (and a
 * reopened form starts clean).
 */
function DialogForm({ dialog, ...props }: Omit<ActionFormProps, 'collapsed'> & { dialog: NonNullable<ActionFormProps['dialog']> }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        className={`btn ${dialog.tone ?? 'secondary'}${dialog.compact ? ' sm' : ''}${dialog.label ? '' : ' icon'}`}
        onClick={() => setOpen(true)}
        // Icon-only triggers take their name from the dialog title.
        aria-label={dialog.label ? undefined : dialog.title}
        title={dialog.label ? undefined : dialog.title}
        aria-haspopup="dialog"
      >
        {dialog.icon ? <Icon name={dialog.icon} /> : null}
        {dialog.label ? <span>{dialog.label}</span> : null}
      </button>
      {open ? (
        <Modal title={dialog.title ?? dialog.label} description={dialog.description} onClose={close}>
          <Form {...props} onDone={close} />
        </Modal>
      ) : null}
    </>
  );
}

export function Modal({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        <button type="button" className="btn ghost icon" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

const isRedirect = (e: unknown) => typeof (e as { digest?: unknown })?.digest === 'string' && (e as { digest: string }).digest.startsWith('NEXT_REDIRECT');

function Form({
  action,
  hidden = {},
  buttons,
  reason = true,
  children,
  confirm,
  onDone,
}: Omit<ActionFormProps, 'collapsed' | 'dialog'> & { onDone?: () => void }) {
  // The toast is raised when the server answers, not in an effect: a successful delete re-renders the list
  // without this row, and an effect in an unmounted form would never run.
  const run = useCallback(
    async (state: ActionState, form: FormData): Promise<ActionState> => {
      try {
        const res = await action(state, form);
        if (res.error) toast('error', 'Not saved', res.error);
        else if (res.ok) toast('success', res.ok);
        return res;
      } catch (e) {
        if (isRedirect(e)) throw e;
        toast('error', 'Something went wrong', 'Check your connection and try again.');
        return { error: 'Something went wrong. Try again.' };
      }
    },
    [action],
  );
  const [state, formAction, pending] = useActionState(run, {});
  const confirmed = useRef(false);

  // A dialog closes itself shortly after a success, so the admin sees the confirmation first.
  useEffect(() => {
    if (!state.ok || !onDone) return;
    const t = setTimeout(onDone, 500);
    return () => clearTimeout(t);
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      className="stack"
      onSubmit={(e) => {
        if (confirmed.current) {
          confirmed.current = false;
          return;
        }
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const btn = buttons.find((b) => (b.value ?? b.label) === submitter?.value);
        const danger = btn?.tone === 'danger';
        if (!confirm && !danger) return;
        e.preventDefault();
        const form = e.currentTarget;
        void confirmAction({
          title: confirm ?? `${btn?.label ?? 'Continue'}?`,
          body: confirm ? undefined : 'This is recorded in the audit log and may not be reversible.',
          confirmLabel: btn?.label ?? 'Confirm',
          tone: danger ? 'danger' : 'primary',
          icon: danger ? 'alert' : btn?.icon,
        }).then((ok) => {
          if (!ok) return;
          confirmed.current = true;
          form.requestSubmit(submitter ?? undefined);
        });
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      {reason ? (
        <label className="field">
          <span>{typeof reason === 'string' ? reason : 'Reason (recorded in the audit log)'}</span>
          <textarea name="reason" required minLength={3} maxLength={500} rows={2} />
        </label>
      ) : null}
      <div className="row">
        {buttons.map((b) => (
          <button key={b.label} type="submit" name="decision" value={b.value ?? b.label} className={`btn ${b.tone ?? 'secondary'}`} disabled={pending}>
            {b.icon ? <Icon name={pending ? 'refresh' : b.icon} className={pending ? 'spin' : undefined} /> : null}
            <span>{b.label}</span>
          </button>
        ))}
        {/* Errors also stay next to the form, since the fields that caused them are here. */}
        {state.error ? (
          <span aria-live="polite" className="notice error">
            <Icon name="alert" /> {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
