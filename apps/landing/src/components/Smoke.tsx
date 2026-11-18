/*
 * Smoke for a glass panel, in the hero's palette. Two layers of SVG fractal noise, each turned into
 * soft lilac wisps (the noise becomes the alpha, the colour is fixed) and blurred a little. Each layer
 * is 40% larger than its box so it can move without showing an edge.
 *
 * Motion lives in Motion.tsx, on two separate elements so the tweens never fight:
 *  - the <svg data-smoke> drifts slowly on its own;
 *  - its wrapper <div data-smoke-pointer data-depth> follows the mouse a little while the pointer is
 *    over the nearest [data-smoke-zone] ancestor (the deeper layer moves more).
 * Under "reduce motion" nothing moves.
 *
 * Place it with `className` (position, size and a mask-image to fade it out). Use it as a child of a
 * `relative overflow-hidden` panel that makes its own stacking context (.glass-card does, through
 * backdrop-filter): -z-10 keeps it behind the panel's content.
 */

const LAYERS = [
  // Wide, bright wisps; follows the mouse a little.
  { id: 'smoke-a', seed: 7, freq: '0.0042 0.0085', color: '0.714 0.608 0.816', gain: 2.6, bias: -0.88, opacity: 0.5, depth: 1 },
  // Slower, deeper bank underneath, a touch more detailed; follows the mouse more.
  { id: 'smoke-b', seed: 23, freq: '0.006 0.011', color: '0.42 0.337 0.514', gain: 2.9, bias: -1.0, opacity: 0.75, depth: 1.8 },
] as const;

export function Smoke({ className = 'inset-0' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`absolute -z-10 overflow-hidden pointer-events-none ${className}`}>
      {LAYERS.map((l) => {
        const [r, g, b] = l.color.split(' ');
        return (
          <div key={l.id} data-smoke-pointer data-depth={l.depth} className="absolute inset-0" style={{ opacity: l.opacity }}>
            <svg data-smoke className="absolute -left-[20%] -top-[20%] h-[140%] w-[140%] will-change-transform" focusable="false">
              <filter id={l.id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency={l.freq} numOctaves={4} seed={l.seed} />
                {/* Fixed colour; the noise's red channel becomes the alpha, with the contrast pushed up. */}
                <feColorMatrix type="matrix" values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${l.gain} 0 0 0 ${l.bias}`} />
                <feGaussianBlur stdDeviation="5" />
              </filter>
              <rect width="100%" height="100%" fill="none" filter={`url(#${l.id})`} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
