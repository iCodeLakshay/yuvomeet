/*
 * Hero background: the limb of a dark planet entering from the LEFT edge and sweeping down to the
 * bottom-right, its rim glowing from dim #4a3b5d to a near-white lilac, with a soft atmospheric haze
 * outside the edge. Pure SVG (no image file).
 *
 * Two scenes, because one circle cannot suit both a wide screen and a phone: the desktop one is
 * anchored top-left (`xMinYMin slice`) so the arc always starts at the left edge however wide the
 * window is; the phone one is a narrower canvas of its own. The glow group carries data-horizon,
 * which Motion.tsx fades gently in and out; the planet body and the line stay still.
 *
 * Palette, all from #4a3b5d: #4a3b5d, #6b5683, #8d74a8, #b69bd0, #e8d9f5.
 */

interface SceneSpec {
  /** Unique id prefix for gradients and filters (two scenes share one document). */
  id: string;
  w: number;
  h: number;
  /** The planet: centre and radius, in viewBox units. */
  c: { cx: number; cy: number; r: number };
  /** The rim gradient runs along the arc, dim to bright, between these points. */
  rim: [number, number, number, number];
  /** Where the haze pools: just outside the bright end of the rim. */
  haze: { cx: number; cy: number; r: number };
  /** Centre of the faint lilac wash high in the sky. */
  sky: { cx: number; cy: number; r: number };
  aspect: string;
  className: string;
}

// Desktop: radius 1100, centred at (274, 1125). The arc enters at the left edge (y 60), runs across
// the top and plunges to the bottom-right, leaving the view near x 1350.
const DESKTOP: SceneSpec = {
  id: 'hbd',
  w: 1940,
  h: 1800,
  c: { cx: 10, cy: 1100, r: 1200 },
  rim: [0, 60, 1300, 900],
  haze: { cx: 1260, cy: 760, r: 720 },
  sky: { cx: 1000, cy: 240, r: 820 },
  aspect: 'xMinYMin slice',
  className: 'hidden md:block',
};

// Phone: a 600x900 canvas, radius 800, centred at (-209, 892). The arc enters at the left edge
// (y 120) and plunges to the bottom-right.
const PHONE: SceneSpec = {
  id: 'hbp',
  w: 600,
  h: 900,
  c: { cx: -209, cy: 892, r: 800 },
  rim: [0, 120, 580, 880],
  haze: { cx: 540, cy: 790, r: 520 },
  sky: { cx: 420, cy: 260, r: 560 },
  aspect: 'xMidYMid slice',
  className: 'md:hidden',
};

function Scene({ id, w, h, c, rim, haze, sky, aspect, className }: SceneSpec) {
  const [x1, y1, x2, y2] = rim;
  const filterRegion = { filterUnits: 'userSpaceOnUse' as const, x: -300, y: -300, width: w + 600, height: h + 600 };
  return (
    <svg className={`absolute inset-0 h-full w-full ${className}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={aspect} focusable="false">
      <defs>
        {/* The rim: dim at the start, brightest where it leaves the view. */}
        <linearGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0" stopColor="#4a3b5d" stopOpacity="0.45" />
          <stop offset="0.4" stopColor="#6b5683" />
          <stop offset="0.72" stopColor="#a98bc9" />
          <stop offset="1" stopColor="#e8d9f5" />
        </linearGradient>
        <linearGradient id={`${id}-core`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0" stopColor="#6b5683" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#c9b0e0" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <radialGradient id={`${id}-haze`} gradientUnits="userSpaceOnUse" cx={haze.cx} cy={haze.cy} r={haze.r}>
          <stop offset="0" stopColor="#8d74a8" stopOpacity="0.62" />
          <stop offset="0.4" stopColor="#4a3b5d" stopOpacity="0.38" />
          <stop offset="1" stopColor="#4a3b5d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" cx={sky.cx} cy={sky.cy} r={sky.r}>
          <stop offset="0" stopColor="#4a3b5d" stopOpacity="0.28" />
          <stop offset="1" stopColor="#4a3b5d" stopOpacity="0" />
        </radialGradient>
        {/* The planet body: near black, lifting a touch at the edge. */}
        <radialGradient id={`${id}-body`} gradientUnits="userSpaceOnUse" cx={c.cx} cy={c.cy} r={c.r}>
          <stop offset="0" stopColor="#020106" />
          <stop offset="0.9" stopColor="#040309" />
          <stop offset="0.985" stopColor="#0e0a17" />
          <stop offset="1" stopColor="#261b36" />
        </radialGradient>
        <filter id={`${id}-lg`} {...filterRegion}>
          <feGaussianBlur stdDeviation="64" />
        </filter>
        <filter id={`${id}-md`} {...filterRegion}>
          <feGaussianBlur stdDeviation="20" />
        </filter>
        <filter id={`${id}-sm`} {...filterRegion}>
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect width={w} height={h} fill="#05040a" />
      <rect width={w} height={h} fill={`url(#${id}-sky)`} />
      <rect width={w} height={h} fill={`url(#${id}-haze)`} />

      {/* Atmosphere: two wide, blurred strokes. The body drawn next hides their inner half. */}
      <g data-horizon>
        <circle {...c} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="230" opacity="0.5" filter={`url(#${id}-lg)`} />
        <circle {...c} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="46" filter={`url(#${id}-md)`} />
      </g>

      <circle {...c} fill={`url(#${id}-body)`} />

      {/* The edge itself: a bloom, then a crisp line, then a faint second line just outside it. */}
      <circle {...c} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="7" filter={`url(#${id}-sm)`} />
      <circle {...c} fill="none" stroke={`url(#${id}-core)`} strokeWidth="1.8" />
      <circle cx={c.cx} cy={c.cy} r={c.r + 14} fill="none" stroke="#4a3b5d" strokeOpacity="0.6" strokeWidth="1" />
    </svg>
  );
}

export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
      <Scene {...DESKTOP} />
      <Scene {...PHONE} />
      {/* Settles the bright end into the next section instead of cutting off. */}
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent to-[#06070a]" />
    </div>
  );
}
