/*
 * Loading placeholders shaped like the page that is coming, so nothing jumps when data arrives.
 * Each route's loading.tsx picks one. Purely presentational; announced once via aria-busy.
 */
import type { ReactNode } from 'react';

const S = ({ w, h, r, className }: { w?: number | string; h: number; r?: number; className?: string }) => (
  <span className={`skeleton${className ? ` ${className}` : ''}`} style={{ width: w ?? '100%', height: h, borderRadius: r }} />
);

function Head({ actions = 1 }: { actions?: number }) {
  return (
    <div className="page-head">
      <div className="page-title">
        <S w={44} h={44} r={12} />
        <div className="stack" style={{ gap: 8 }}>
          <S w={220} h={24} />
          <S w={320} h={14} />
        </div>
      </div>
      <div className="row">
        {Array.from({ length: actions }, (_, i) => (
          <S key={i} w={120} h={36} r={10} />
        ))}
      </div>
    </div>
  );
}

function Rows({ n = 8, cols = 5 }: { n?: number; cols?: number }) {
  return (
    <div className="card flush sk-table">
      <div className="sk-row head">
        {Array.from({ length: cols }, (_, c) => (
          <S key={c} h={12} w={`${50 + ((c * 17) % 40)}%`} />
        ))}
      </div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sk-row">
          {Array.from({ length: cols }, (_, c) => (
            <S key={c} h={14} w={`${45 + (((i + 1) * (c + 3) * 13) % 50)}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

const Busy = ({ children }: { children: ReactNode }) => (
  <section className="page" aria-busy="true" aria-label="Loading">
    {children}
  </section>
);

export function TableSkeleton({ tabs = true, cols = 5 }: { tabs?: boolean; cols?: number }) {
  return (
    <Busy>
      <Head />
      {tabs ? <S w={380} h={40} r={12} /> : null}
      <S h={52} r={14} />
      <Rows cols={cols} />
      <div className="spread">
        <S w={140} h={14} />
        <S w={220} h={30} r={8} />
      </div>
    </Busy>
  );
}

export function DashboardSkeleton() {
  return (
    <Busy>
      <Head actions={2} />
      <div className="stats">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="stat sk-stat">
            <div className="row">
              <S w={32} h={32} r={10} />
              <S w={120} h={12} />
            </div>
            <S w={110} h={30} />
            <S h={40} r={6} />
          </div>
        ))}
      </div>
      <div className="dash-grid">
        <div className="card">
          <S w={180} h={16} />
          <div className="sk-bars">
            {Array.from({ length: 14 }, (_, i) => (
              <S key={i} h={40 + ((i * 37) % 140)} r={4} />
            ))}
          </div>
        </div>
        <div className="card">
          <S w={160} h={16} />
          <div className="row" style={{ gap: 24, alignItems: 'center' }}>
            <S w={150} h={150} r={999} />
            <div className="stack" style={{ flex: 1 }}>
              {Array.from({ length: 4 }, (_, i) => (
                <S key={i} h={14} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="dash-grid three">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card">
            <S w={150} h={16} />
            {Array.from({ length: 4 }, (_, j) => (
              <S key={j} h={36} r={8} />
            ))}
          </div>
        ))}
      </div>
    </Busy>
  );
}

export function DetailSkeleton() {
  return (
    <Busy>
      <S w={180} h={14} />
      <Head actions={2} />
      <div className="card">
        <div className="facts">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="stack" style={{ gap: 6 }}>
              <S w={90} h={11} />
              <S w={130} h={16} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid2">
        <Rows n={4} cols={4} />
        <Rows n={4} cols={4} />
      </div>
      <Rows n={5} cols={4} />
    </Busy>
  );
}

export function FormSkeleton() {
  return (
    <Busy>
      <Head />
      <S w={300} h={40} r={12} />
      <div className="grid2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card">
            <S w={160} h={16} />
            {Array.from({ length: 3 }, (_, j) => (
              <div key={j} className="spread">
                <S w="45%" h={14} />
                <S w={120} h={34} r={10} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Busy>
  );
}
