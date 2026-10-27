import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatDue, humanize } from '@/lib/format';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const TONES: Record<string, Tone> = {
  severe: 'danger',
  escalated: 'danger',
  banned: 'danger',
  rejected: 'danger',
  blocked_minor: 'danger',
  suspended: 'warning',
  pending: 'warning',
  in_review: 'accent',
  manual_review: 'warning',
  open: 'warning',
  review: 'warning',
  approved: 'success',
  active: 'success',
  verified: 'success',
  live: 'success',
  upheld: 'success',
  pass: 'success',
};

/** Status pill; the tone follows the value so every page colours states the same way. */
export function Badge({ value, tone }: { value: string | null | undefined; tone?: Tone }) {
  return <span className={`badge ${tone ?? TONES[value ?? ''] ?? 'neutral'}`}>{humanize(value)}</span>;
}

export function Due({ at }: { at: string }) {
  const due = formatDue(at);
  return <span className={due.overdue ? 'error' : 'muted'}>{due.label}</span>;
}

export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="card">
      {title ? <h2>{title}</h2> : null}
      {children}
    </div>
  );
}

/** Label / value grid for record details. */
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="facts">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Filter tabs driven by a search param, so filtered views stay linkable. */
export function Tabs({ base, param, value, items }: { base: string; param: string; value: string; items: [string, string][] }) {
  return (
    <nav className="tabs">
      {items.map(([v, label]) => (
        <Link key={v} href={`${base}?${param}=${v}`} className={v === value ? 'active' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function UserLink({ id, name }: { id: string | null | undefined; name?: string | null }) {
  if (!id) return <>—</>;
  return <Link href={`/users/${id}`}>{name || id.slice(0, 8)}</Link>;
}
