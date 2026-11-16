'use client';

/*
 * Toasts and confirm prompts for the whole console. Both are tiny module-level stores with one host
 * component mounted in the root layout, so any client component can call toast() or confirmAction()
 * without threading context through server components.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon, type IconName } from './Icon';

// ---------------------------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------------------------
export type ToastTone = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
  leaving?: boolean;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const EMPTY: Toast[] = [];

function dismiss(id: number) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 220);
}

/** Show a toast. Errors stay longer, because they usually need reading. */
export function toast(tone: ToastTone, title: string, body?: string) {
  const id = nextId++;
  toasts = [...toasts.slice(-4), { id, tone, title, body }];
  emit();
  setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4200);
}

const TONE_ICON: Record<ToastTone, IconName> = { success: 'check', error: 'alert', info: 'bell', warning: 'shieldAlert' };

function ToastStack() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
  return (
    <div className="toasts" role="region" aria-label="Notifications">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.tone}${t.leaving ? ' leaving' : ''}`} role={t.tone === 'error' ? 'alert' : 'status'}>
          <span className="toast-icon">
            <Icon name={TONE_ICON[t.tone]} size={16} />
          </span>
          <div className="toast-text">
            <strong>{t.title}</strong>
            {t.body ? <span>{t.body}</span> : null}
          </div>
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <Icon name="close" size={14} />
          </button>
          <span className="toast-timer" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

/**
 * Toasts that must survive a redirect (sign-out, deleting the record you are looking at) travel as a
 * short code in ?toast=. Only known codes are shown, so a crafted link cannot put arbitrary words on screen.
 */
const URL_TOASTS: Record<string, [ToastTone, string]> = {
  signed_out: ['info', 'You are signed out.'],
  signed_in: ['success', 'Welcome back.'],
  venue_deleted: ['success', 'Venue deleted.'],
  not_admin: ['error', 'This account has no console access.'],
};

function UrlToast() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const code = params.get('toast');
  useEffect(() => {
    if (!code) return;
    const known = URL_TOASTS[code];
    if (known) toast(known[0], known[1]);
    const rest = new URLSearchParams(params);
    rest.delete('toast');
    router.replace(rest.size ? `${path}?${rest}` : path, { scroll: false });
  }, [code, params, path, router]);
  return null;
}

// ---------------------------------------------------------------------------------------------
// Confirm prompts (styled replacement for window.confirm)
// ---------------------------------------------------------------------------------------------
export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: IconName;
}
let pending: { opts: ConfirmOptions; resolve: (ok: boolean) => void } | null = null;
const confirmListeners = new Set<() => void>();

/** Resolves true when the person confirms, false when they cancel or press Escape. */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  pending?.resolve(false);
  return new Promise((resolve) => {
    pending = { opts, resolve };
    confirmListeners.forEach((l) => l());
  });
}

function ConfirmHost() {
  const [, force] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    confirmListeners.add(l);
    return () => {
      confirmListeners.delete(l);
    };
  }, []);
  const current = pending;
  useEffect(() => {
    if (current && ref.current && !ref.current.open) ref.current.showModal();
  }, [current]);
  const finish = useCallback((ok: boolean) => {
    const p = pending;
    pending = null;
    ref.current?.close();
    p?.resolve(ok);
    force((n) => n + 1);
  }, []);
  if (!current) return null;
  const { opts } = current;
  const tone = opts.tone ?? 'danger';
  return (
    <dialog
      ref={ref}
      className="modal confirm"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
      onClick={(e) => e.target === ref.current && finish(false)}
    >
      <div className={`confirm-icon ${tone}`}>
        <Icon name={opts.icon ?? (tone === 'danger' ? 'alert' : 'check')} size={20} />
      </div>
      <h2 id="confirm-title">{opts.title}</h2>
      {opts.body ? <p className="muted">{opts.body}</p> : null}
      <div className="row confirm-actions">
        <button type="button" className="btn ghost" onClick={() => finish(false)}>
          Cancel
        </button>
        {/* Focus lands on the safe choice for destructive prompts, on the action otherwise. */}
        <button type="button" className={`btn ${tone}`} onClick={() => finish(true)} autoFocus={tone !== 'danger'}>
          {opts.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </dialog>
  );
}

/** Mounted once in the root layout. */
export function FeedbackHost() {
  return (
    <>
      <ToastStack />
      <ConfirmHost />
      <Suspense fallback={null}>
        <UrlToast />
      </Suspense>
    </>
  );
}
