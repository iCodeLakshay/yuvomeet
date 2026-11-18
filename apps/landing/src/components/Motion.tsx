'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/*
 * Subtle motion for the whole site, all GSAP, all opt-in through data-* hooks in the markup:
 *  - background:  [data-aura] glows drift slowly; [data-horizon] (the hero's rim glow) breathes;
 *                 [data-smoke] layers (the CTA's smoke) drift against each other and, inside a
 *                 [data-smoke-zone], lean toward the mouse ([data-smoke-pointer]).
 *  - cards:       children of [data-reveal] rise in once as they scroll into view, then lift on hover.
 *  - graphics:    [data-gauge] fills, [data-draw] paths draw, [data-bar] bars grow, [data-line] extends,
 *                 [data-fade] fills fade in, [data-float] icons bob gently.
 *  - buttons:     [data-magnetic] leans toward the pointer (mouse and trackpad only).
 * GSAP is imported after hydration so it never blocks the first paint. Everything runs inside one
 * gsap.matchMedia() that is reverted on route change and unmount; under prefers-reduced-motion
 * nothing runs and the page stands as written.
 */

type Gsap = typeof import('gsap').gsap;
type ScrollTriggerType = typeof import('gsap/ScrollTrigger').ScrollTrigger;

const ONCE = (trigger: Element, start = 'top 85%') => ({ trigger, start, once: true });

function background(gsap: Gsap) {
  gsap.utils.toArray<HTMLElement>('[data-aura]').forEach((el, i) => {
    gsap.to(el, {
      x: gsap.utils.random(-70, 70),
      y: gsap.utils.random(-45, 45),
      scale: 1.12,
      duration: 16 + i * 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  });
  gsap.utils.toArray<HTMLElement>('[data-horizon]').forEach((el) => {
    gsap.fromTo(el, { opacity: 1 }, { opacity: 0.7, duration: 4.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });
  // The CTA's smoke: each layer drifts the opposite way to the one before, so the wisps shear and mix.
  gsap.utils.toArray<HTMLElement>('[data-smoke]').forEach((el, i) => {
    const dir = i % 2 ? -1 : 1;
    gsap.to(el, { x: 70 * dir, y: -34 * dir, rotation: 5 * dir, scale: 1.08, duration: 20 + i * 7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });
}

function cards(gsap: Gsap, cleanups: Array<() => void>, hover: boolean) {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((group) => {
    const items = group.querySelectorAll<HTMLElement>(':scope > .glass-card');
    if (!items.length) return;
    // opacity, not autoAlpha: visibility:hidden would take content below the fold out of the tab order.
    gsap.from(items, { y: 28, opacity: 0, duration: 0.85, ease: 'power3.out', stagger: 0.09, scrollTrigger: ONCE(group) });
    if (!hover || group.tagName === 'SECTION') return; // the big CTA panel stays put
    items.forEach((card) => {
      const up = () => gsap.to(card, { y: -5, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
      const down = () => gsap.to(card, { y: 0, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
      card.addEventListener('pointerenter', up);
      card.addEventListener('pointerleave', down);
      cleanups.push(() => {
        card.removeEventListener('pointerenter', up);
        card.removeEventListener('pointerleave', down);
      });
    });
  });
}

function graphics(gsap: Gsap) {
  gsap.utils.toArray<SVGCircleElement>('[data-gauge]').forEach((el) => {
    gsap.from(el, { attr: { 'stroke-dashoffset': 251.2 }, duration: 1.6, ease: 'power2.out', scrollTrigger: ONCE(el) });
  });
  gsap.utils.toArray<SVGPathElement>('[data-draw]').forEach((el) => {
    const len = el.getTotalLength();
    gsap.fromTo(
      el,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset', scrollTrigger: ONCE(el) },
    );
  });
  gsap.utils.toArray<SVGPathElement>('[data-fade]').forEach((el) => {
    gsap.from(el, { opacity: 0, duration: 1.2, delay: 0.5, ease: 'power1.out', scrollTrigger: ONCE(el) });
  });
  const bars = gsap.utils.toArray<HTMLElement>('[data-bar]');
  const firstBar = bars[0];
  if (firstBar) {
    gsap.from(bars, { scaleY: 0, transformOrigin: '50% 100%', duration: 1.1, ease: 'power3.out', stagger: 0.18, scrollTrigger: ONCE(firstBar) });
  }
  gsap.utils.toArray<HTMLElement>('[data-line]').forEach((el) => {
    gsap.from(el, { scaleX: 0, transformOrigin: '0% 50%', duration: 1.4, ease: 'power2.inOut', scrollTrigger: ONCE(el, 'top 80%') });
  });
  gsap.utils.toArray<HTMLElement>('[data-float]').forEach((el, i) => {
    gsap.to(el, { y: -5, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.4 });
  });
}

function magnetic(gsap: Gsap, cleanups: Array<() => void>) {
  gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x(((e.clientX - (r.left + r.width / 2)) / r.width) * 8);
      y(((e.clientY - (r.top + r.height / 2)) / r.height) * 6);
    };
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    cleanups.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    });
  });
}

/**
 * The CTA's smoke follows the mouse a little while it is over the panel ([data-smoke-zone]); the deeper
 * layer ([data-depth]) moves further, so the two shear. quickTo with a long duration keeps it lazy.
 */
function smokePointer(gsap: Gsap, cleanups: Array<() => void>) {
  gsap.utils.toArray<HTMLElement>('[data-smoke-zone]').forEach((zone) => {
    const layers = Array.from(zone.querySelectorAll<HTMLElement>('[data-smoke-pointer]')).map((el) => ({
      depth: Number(el.dataset.depth ?? 1),
      x: gsap.quickTo(el, 'x', { duration: 1.4, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'y', { duration: 1.4, ease: 'power3.out' }),
    }));
    if (!layers.length) return;
    const move = (e: PointerEvent) => {
      const r = zone.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5 across the panel
      const ny = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((l) => {
        l.x(nx * 56 * l.depth);
        l.y(ny * 36 * l.depth);
      });
    };
    const leave = () => layers.forEach((l) => { l.x(0); l.y(0); });
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerleave', leave);
    cleanups.push(() => {
      zone.removeEventListener('pointermove', move);
      zone.removeEventListener('pointerleave', leave);
    });
  });
}

export function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let revert: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const st: ScrollTriggerType = ScrollTrigger;

      const mm = gsap.matchMedia();
      mm.add(
        { motion: '(prefers-reduced-motion: no-preference)', fine: '(hover: hover) and (pointer: fine)' },
        (context) => {
          const { motion, fine } = context.conditions ?? {};
          if (!motion) return;
          const cleanups: Array<() => void> = [];
          background(gsap);
          cards(gsap, cleanups, !!fine);
          graphics(gsap);
          if (fine) {
            magnetic(gsap, cleanups);
            smokePointer(gsap, cleanups);
          }
          return () => cleanups.forEach((off) => off());
        },
      );
      // Fonts can change line breaks; measure the trigger positions again once they are in.
      void document.fonts?.ready.then(() => { if (!cancelled) st.refresh(); });
      revert = () => mm.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [pathname]);

  return null;
}
