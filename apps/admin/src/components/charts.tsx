'use client';

/*
 * Small, dependency-free charts for the dashboard. Data is computed on the server and passed in as plain
 * arrays. Colours follow the validated categorical order (blue, orange, aqua, yellow, magenta, violet; dark
 * steps, checked against the card surface); text always wears text tokens, never a series colour.
 */
import { useId, useState } from 'react';

export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'] as const;

/** A single-series trend line under a stat tile. Recessive: no axes, one hue, an area wash. */
export function Sparkline({ values, color = SERIES[0], label }: { values: number[]; color?: string; label: string }) {
  const id = useId();
  const max = Math.max(1, ...values);
  const n = Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [(i / n) * 100, 30 - (v / max) * 26] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L100,32 L0,32 Z`;
  return (
    <svg className="spark" viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} className="spark-area" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="spark-line" />
    </svg>
  );
}

export interface BarSeries {
  name: string;
  values: number[];
}

/**
 * Grouped columns over days, with a hover band and tooltip per day. Values sit on one y-scale (never two),
 * so only series of the same unit go together.
 */
export function BarChart({ labels, series, unit = '' }: { labels: string[]; series: BarSeries[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).reverse();
  return (
    <div className="bars">
      <div className="bars-legend">
        {series.map((s, i) => (
          <span key={s.name} className="legend-item">
            <i style={{ background: SERIES[i] }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="bars-plot">
        <div className="bars-axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>{fmt(t)}</span>
          ))}
        </div>
        <div className="bars-grid" role="img" aria-label={`${series.map((s) => s.name).join(' and ')} per day`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <span key={t} className="bars-rule" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          {labels.map((label, d) => (
            <div key={label + d} className={`bars-col${hover === d ? ' on' : ''}`} onMouseEnter={() => setHover(d)} onFocus={() => setHover(d)} tabIndex={0} aria-label={`${label}: ${series.map((s) => `${s.name} ${s.values[d]}`).join(', ')}`}>
              <div className="bars-group">
                {series.map((s, i) => (
                  <span key={s.name} className="bar" style={{ height: `${((s.values[d] ?? 0) / top) * 100}%`, background: SERIES[i], animationDelay: `${d * 28}ms` }} />
                ))}
              </div>
              {hover === d ? (
                <div className={`tip${d > labels.length * 0.6 ? ' left' : ''}`} role="status">
                  <strong>{label}</strong>
                  {series.map((s, i) => (
                    <span key={s.name}>
                      <i style={{ background: SERIES[i] }} />
                      {s.name}
                      <b>
                        {unit}
                        {(s.values[d] ?? 0).toLocaleString('en-IN')}
                      </b>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="bars-x" aria-hidden="true">
        {labels.map((l, i) => (
          <span key={l + i}>{i % Math.ceil(labels.length / 7) === 0 || i === labels.length - 1 ? l : ''}</span>
        ))}
      </div>
    </div>
  );
}

export interface Slice {
  label: string;
  value: number;
}

/** Part-to-whole for a handful of categories (fold the rest into "Other" before calling). */
export function Donut({ items, total, caption }: { items: Slice[]; total?: number; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const sum = items.reduce((s, i) => s + i.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  const gap = sum > 0 && items.filter((i) => i.value > 0).length > 1 ? 3 : 0;
  let offset = 0;
  const shown = hover === null ? null : items[hover];
  return (
    <div className="donut">
      <div className="donut-ring">
        <svg viewBox="0 0 140 140" role="img" aria-label={`${caption}: ${items.map((i) => `${i.label} ${i.value}`).join(', ')}`}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--surface3)" strokeWidth="14" />
          {sum > 0
            ? items.map((it, i) => {
                const len = (it.value / sum) * c;
                const dash = Math.max(0, len - gap);
                const el = (
                  <circle
                    key={it.label}
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke={SERIES[i % SERIES.length]}
                    strokeWidth={hover === i ? 18 : 14}
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    className="donut-seg"
                    style={{ animationDelay: `${i * 70}ms`, opacity: hover === null || hover === i ? 1 : 0.35 }}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
                offset += len;
                return el;
              })
            : null}
        </svg>
        <div className="donut-center">
          <strong>{(shown ? shown.value : (total ?? sum)).toLocaleString('en-IN')}</strong>
          <span>{shown ? shown.label : caption}</span>
        </div>
      </div>
      <ul className="donut-legend">
        {items.map((it, i) => (
          <li key={it.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={hover === i ? 'on' : undefined}>
            <i style={{ background: SERIES[i % SERIES.length] }} />
            <span className="donut-label">{it.label}</span>
            <b>{it.value.toLocaleString('en-IN')}</b>
            <span className="muted">{sum ? Math.round((it.value / sum) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  // Counts and rupees are whole numbers, so the axis never shows half a member.
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
}

function fmt(n: number) {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}
