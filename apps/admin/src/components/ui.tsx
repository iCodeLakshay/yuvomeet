import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatCount, formatDue, humanize, PAGE_SIZE, PAGE_SIZES } from '@/lib/format';
import { Sparkline } from './charts';
import { Icon, type IconName } from './Icon';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const TONES: Record<string, Tone> = {
  severe: 'danger',
  escalated: 'danger',
  banned: 'danger',
  rejected: 'danger',
  blocked_minor: 'danger',
  failed: 'danger',
  deleted: 'danger',
  suspended: 'warning',
  pending: 'warning',
  in_review: 'accent',
  manual_review: 'warning',
  open: 'warning',
  review: 'warning',
  held: 'warning',
  refund_pending: 'warning',
  created: 'neutral',
  approved: 'success',
  active: 'success',
  verified: 'success',
  live: 'success',
  upheld: 'success',
  pass: 'success',
  paid: 'success',
  visible: 'success',
  actioned: 'success',
  refunded: 'accent',
  beta: 'accent',
  admin: 'accent',
  premium: 'accent',
  plus: 'accent',
};

/** Status pill; the tone follows the value so every page colours states the same way. */
export function Badge({ value, tone }: { value: string | null | undefined; tone?: Tone }) {
  return <span className={`badge ${tone ?? TONES[value ?? ''] ?? 'neutral'}`}>{humanize(value)}</span>;
}

export function Due({ at }: { at: string }) {
  const due = formatDue(at);
  return <span className={due.overdue ? 'error' : 'muted'}>{due.label}</span>;
}

export interface Crumb {
  href: string;
  label: string;
}

export function Page({
  title,
  icon,
  subtitle,
  actions,
  crumbs,
  children,
}: {
  title: string;
  icon?: IconName;
  subtitle?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
  children: ReactNode;
}) {
  return (
    <section className="page">
      {crumbs?.length ? (
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((c) => (
            <span key={c.href}>
              <Link href={c.href}>{c.label}</Link>
              <Icon name="forward" size={14} />
            </span>
          ))}
          <span aria-current="page">{title}</span>
        </nav>
      ) : null}
      <header className="page-head">
        <div className="page-title">
          {icon ? (
            <span className="page-icon">
              <Icon name={icon} size={20} />
            </span>
          ) : null}
          <div>
            <h1>{title}</h1>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="row">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function Card({ title, icon, actions, children, flush }: { title?: string; icon?: IconName; actions?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <div className={`card${flush ? ' flush' : ''}`}>
      {title || actions ? (
        <div className="card-head">
          {title ? (
            <h2>
              {icon ? <Icon name={icon} /> : null}
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions ? <div className="row">{actions}</div> : null}
        </div>
      ) : null}
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

export function Empty({ children, icon = 'inbox' }: { children: ReactNode; icon?: IconName }) {
  return (
    <div className="empty">
      <Icon name={icon} size={22} />
      <p>{children}</p>
    </div>
  );
}

/** A dashboard tile: a number, what it counts, and where to act on it. */
export function Stat({
  label,
  value,
  icon,
  href,
  tone,
  hint,
  trend,
  delta,
  featured,
}: {
  label: string;
  value: ReactNode;
  icon: IconName;
  href?: string;
  tone?: Tone;
  hint?: ReactNode;
  /** Daily values for a sparkline under the number. */
  trend?: number[];
  /** Change against the previous period, in percent; shown with an arrow and a word, not colour alone. */
  delta?: number | null;
  featured?: boolean;
}) {
  const body = (
    <>
      <span className="stat-top">
        <span className={`stat-icon ${tone ?? 'neutral'}`}>
          <Icon name={icon} size={16} />
        </span>
        <span className="stat-label">{label}</span>
        {href ? <Icon name="arrowUpRight" size={15} className="stat-go" /> : null}
      </span>
      <span className="stat-main">
        <span className="stat-value">{value}</span>
        {delta !== undefined && delta !== null ? (
          <span className={`delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
            <Icon name={delta >= 0 ? 'trend' : 'trendDown'} size={13} />
            {delta > 0 ? '+' : ''}
            {delta}% <span className="muted">vs last week</span>
          </span>
        ) : null}
      </span>
      {trend ? <Sparkline values={trend} label={`${label}, last ${trend.length} days`} /> : null}
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </>
  );
  const cls = `stat${featured ? ' featured' : ''}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A labelled horizontal meter (share of a whole), with the number written out. */
export function Meter({ label, value, total, tone = 'accent' }: { label: string; value: number; total: number; tone?: Tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="meter">
      <div className="spread small">
        <span>{label}</span>
        <span className="muted">
          {formatCount(value)} · {pct}%
        </span>
      </div>
      <div className="meter-track" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <span className={`meter-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LinkButton({ href, icon, children, tone = 'secondary', size }: { href: string; icon?: IconName; children: ReactNode; tone?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' }) {
  return (
    <Link href={href} className={`btn ${tone}${size ? ` ${size}` : ''}`}>
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </Link>
  );
}

/** Filter tabs driven by a search param, so filtered views stay linkable (client: sliding highlight). */
export { Tabs, ClientTable, Toolbar } from './motion';

export function SearchInput({ name = 'q', defaultValue, placeholder }: { name?: string; defaultValue?: string; placeholder: string }) {
  return (
    <label className="search">
      <Icon name="search" />
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

/** Page numbers to show: first, last, and two either side of the current one, with gaps as null. */
function pageWindow(page: number, pages: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out.at(-1) !== null) out.push(null);
  }
  return out;
}

/**
 * Server-side paging: numbered links, previous / next, and a rows-per-page choice. Every link keeps the
 * current filters, and the page itself only ever fetches one range (see paging()).
 */
export function Pager({ base, params, page, total, size }: { base: string; params: Record<string, string | undefined>; page: number; total: number | null; size: number }) {
  const count = total ?? 0;
  const pages = Math.max(1, Math.ceil(count / size));
  if (!count) return null;
  const href = (p: number, s = size) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== 'page' && k !== 'size') q.set(k, v);
    if (s !== PAGE_SIZE) q.set('size', String(s));
    if (p > 1) q.set('page', String(p));
    const str = q.toString();
    return str ? `${base}?${str}` : base;
  };
  const first = (page - 1) * size + 1;
  const last = Math.min(page * size, count);
  return (
    <nav className="pager" aria-label="Pages">
      <span className="muted small">
        {first > count ? `Page ${page} is past the end · ${formatCount(count)} total` : `${formatCount(first)}–${formatCount(last)} of ${formatCount(count)}`}
      </span>
      <div className="row pager-pages">
        {page > 1 ? (
          <Link className="btn sm icon" href={href(page - 1)} aria-label="Previous page" scroll={false}>
            <Icon name="prev" />
          </Link>
        ) : (
          <span className="btn sm icon" aria-disabled="true">
            <Icon name="prev" />
          </span>
        )}
        {pageWindow(page, pages).map((p, i) =>
          p === null ? (
            <span key={`gap${i}`} className="pager-gap">
              …
            </span>
          ) : (
            <Link key={p} href={href(p)} className={`btn sm pager-num${p === page ? ' active' : ''}`} aria-current={p === page ? 'page' : undefined} scroll={false}>
              {p}
            </Link>
          ),
        )}
        {page < pages ? (
          <Link className="btn sm icon" href={href(page + 1)} aria-label="Next page" scroll={false}>
            <Icon name="forward" />
          </Link>
        ) : (
          <span className="btn sm icon" aria-disabled="true">
            <Icon name="forward" />
          </span>
        )}
      </div>
      <div className="row pager-size">
        <span className="muted small">Rows</span>
        {PAGE_SIZES.map((s) => (
          <Link key={s} href={href(1, s)} className={`pager-sz${s === size ? ' active' : ''}`} scroll={false}>
            {s}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function UserLink({ id, name }: { id: string | null | undefined; name?: string | null }) {
  if (!id) return <>—</>;
  return <Link href={`/users/${id}`}>{name || id.slice(0, 8)}</Link>;
}

/** Shown when a page's query failed; the database message itself stays in the server log. */
export function LoadError({ error }: { error: { message: string } | null | undefined }) {
  if (!error) return null;
  console.error('admin page query failed', error.message);
  return (
    <p className="notice error" role="alert">
      <Icon name="alert" /> Some data did not load. Reload the page, and tell an admin if it keeps happening.
    </p>
  );
}
