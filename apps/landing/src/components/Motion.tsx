'use client';

import { useEffect } from 'react';

/*
 * The page moves in three places, as tasteskill's motion.md asks, and nowhere else:
 *  1. the hero's entrance, once on load: CSS in globals.css, so the headline never waits for script;
 *  2. the dealt moment, word-highlight: the statement turns from half ink to ink as it scrolls past;
 *  3. the hero's result card loop (a request becoming a seat), once, restarting on hover.
 * Hover and press live in CSS. GSAP loads after hydration with a dynamic import, so it never sits in
 * the initial bundle, and everything runs inside one gsap.matchMedia() that is reverted on unmount.
 * Under prefers-reduced-motion nothing here runs and the page stands as written.
 */

type Gsap = typeof import('gsap').gsap;
type SplitTextType = typeof import('gsap/SplitText').SplitText;

function resultLoop(gsap: Gsap, delay: number) {
  const card = document.querySelector<HTMLElement>('[data-loop="result"]');
  if (!card) return;
  const sent = card.querySelector('[data-state="sent"]');
  const seat = card.querySelector('[data-state="in"]');
  if (!sent || !seat) return;
  // One cycle (about 3.4 s): the request goes out, then the seat is confirmed. It rests on the seat.
  const tl = gsap.timeline({ delay, defaults: { duration: 0.32, ease: 'power2.out' } });
  tl.set(seat, { autoAlpha: 0 })
    .set(sent, { autoAlpha: 1 })
    .from(sent, { y: 6 })
    .to(sent, { autoAlpha: 0, y: -6 }, '+=1.6')
    .fromTo(seat, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0 }, '<0.08');
  const restart = () => { if (!tl.isActive()) tl.restart(); };
  card.addEventListener('pointerenter', restart);
  return () => card.removeEventListener('pointerenter', restart);
}

function wordHighlight(gsap: Gsap, SplitText: SplitTextType) {
  const statement = document.querySelector<HTMLElement>('[data-moment="word-highlight"] .statement');
  if (!statement) return;
  const split = SplitText.create(statement, { type: 'words', wordsClass: 'w' });
  // Half ink (about 4:1 on the ground, still readable) to full ink as the words cross the screen.
  gsap.set(split.words, { opacity: 0.5 });
  gsap.to(split.words, {
    opacity: 1,
    ease: 'none',
    stagger: 0.12,
    scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 42%', scrub: 0.4 },
  });
}

export function Motion() {
  useEffect(() => {
    let cancelled = false;
    let revert: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/SplitText'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const mm = gsap.matchMedia();
      mm.add(
        { motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 1024px)' },
        (context) => {
          const { motion, desktop } = context.conditions ?? {};
          if (!motion) return;
          const offLoop = desktop ? resultLoop(gsap, 1.2) : undefined;
          wordHighlight(gsap, SplitText);
          return () => offLoop?.();
        },
      );
      // Fonts can change line breaks; measure the scroll positions again once they are in.
      void document.fonts?.ready.then(() => { if (!cancelled) ScrollTrigger.refresh(); });
      revert = () => mm.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return null;
}
