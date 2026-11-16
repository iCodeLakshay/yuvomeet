'use client';

import Form from 'next/form';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Children, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Plays the enter animation when the person moves to another section (a new path). Filter, tab and
 * page changes keep the same path, so the page is not remounted: React keeps the header, tabs, toolbar
 * and pager as they are and only swaps the rows that changed.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div key={path} className="route-enter">
      {children}
    </div>
  );
}

/**
 * While a navigation is in flight: a thin bar at the top and the data areas dimmed, instead of swapping the
 * whole page for a skeleton. Starts on an in-app link click or toolbar submit; ends when the URL changes.
 */
function NavProgressInner() {
  const path = usePathname();
  const params = useSearchParams();
  const url = `${path}?${params}`;
  useEffect(() => {
    delete document.documentElement.dataset.nav;
  }, [url]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      document.documentElement.dataset.nav = 'pending';
      clearTimeout(timer);
      timer = setTimeout(() => delete document.documentElement.dataset.nav, 15_000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== location.origin) return;
      if (a.pathname + a.search === location.pathname + location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      if ((e.target as HTMLFormElement).classList.contains('toolbar')) start();
    };
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('submit', onSubmit);
      clearTimeout(timer);
    };
  }, []);
  return <div className="nav-progress" aria-hidden="true" />;
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <NavProgressInner />
    </Suspense>
  );
}

/**
 * A GET filter form. next/form navigates on the client, so applying filters updates the list in place
 * instead of reloading the whole document (sidebar and all). Filters stay in the URL, so views can be shared.
 */
export function Toolbar({ children, action }: { children: ReactNode; action?: string }) {
  const path = usePathname();
  return (
    <Form className="toolbar" action={action ?? path} scroll={false}>
      {children}
      <button className="btn">
        <Icon name="filter" />
        <span>Apply</span>
      </button>
    </Form>
  );
}

/** Filter tabs driven by a search param, with a sliding highlight under the active one. */
export function Tabs({ base, param, value, items, keep }: { base: string; param: string; value: string; items: [string, string][]; keep?: Record<string, string | undefined> }) {
  const nav = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  // The clicked tab lights up at once; the server's answer then confirms it (or moves it back).
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked ?? value;
  useEffect(() => setPicked(null), [value]);
  const qs = (v: string) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(keep ?? {})) if (val) p.set(k, val);
    p.set(param, v);
    return p.toString();
  };
  useLayoutEffect(() => {
    const measure = () => {
      const el = nav.current?.querySelector<HTMLElement>('a.active');
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);
  return (
    <nav className="tabs" ref={nav}>
      {pill ? <span className="tabs-pill" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} aria-hidden="true" /> : null}
      {items.map(([v, label]) => (
        <Link
          key={v}
          href={`${base}?${qs(v)}`}
          className={v === active ? 'active' : undefined}
          aria-current={v === value ? 'page' : undefined}
          scroll={false}
          onClick={() => setPicked(v)}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * A table whose rows are already loaded (short lists on a record page): pages through them in the browser
 * instead of asking the server again. Rows arrive server-rendered, so nothing extra is fetched.
 */
export function ClientTable({ head, children, pageSize = 10, label = 'rows' }: { head?: ReactNode; children: ReactNode; pageSize?: number; label?: string }) {
  const rows = Children.toArray(children);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  return (
    <>
      <div className="tablewrap">
        <table>
          {head ? <thead>{head}</thead> : null}
          <tbody key={current} className="rows-enter">
            {rows.slice(start, start + pageSize)}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <nav className="pager client" aria-label="Pages">
          <span className="muted small">
            {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length} {label}
          </span>
          <div className="row">
            <button type="button" className="btn sm icon" aria-label="Previous page" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              <Icon name="prev" />
            </button>
            <span className="small muted">
              {current} / {pages}
            </span>
            <button type="button" className="btn sm icon" aria-label="Next page" disabled={current >= pages} onClick={() => setPage(current + 1)}>
              <Icon name="forward" />
            </button>
          </div>
        </nav>
      ) : null}
    </>
  );
}
