'use client';

import { useEffect, useState } from 'react';

/**
 * Position dots for a horizontal scroll-snap track (phones only: the track is a grid from md up).
 * Reads the track's scroll position, and tapping a dot scrolls to that card. `targetId` is the track's
 * id; the cards are its direct `.glass-card` children.
 */
export function CarouselDots({ targetId, count, label }: { targetId: string; count: number; label: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = document.getElementById(targetId);
    if (!track) return;
    const onScroll = () => {
      const max = track.scrollWidth - track.clientWidth;
      setActive(max > 0 ? Math.round((track.scrollLeft / max) * (count - 1)) : 0);
    };
    onScroll();
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [targetId, count]);

  const goTo = (i: number) => {
    const track = document.getElementById(targetId);
    // Only the cards: the track also holds a decorative line that is not a slide.
    const card = track?.querySelectorAll<HTMLElement>(':scope > .glass-card')[i];
    if (!track || !card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div role="group" aria-label={`${label} navigation`} className="md:hidden flex justify-center gap-1 mt-4">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${label} ${i + 1} of ${count}`}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => goTo(i)}
          className="h-6 w-6 flex items-center justify-center"
        >
          <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-5 bg-accent-violet' : 'w-1.5 bg-white/25'}`} />
        </button>
      ))}
    </div>
  );
}
