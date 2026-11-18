import { BRAND } from '@/content/site';
import { Logo } from './Logo';

/**
 * Floating glass header from the Stitch design. Below md only the mark and the waitlist action show.
 * Plain <a>, not next/link: the static export (Next 16.4) writes RSC segment files under a path its
 * client prefetch does not request, so client-side navigation 404s on static hosts. Three pages need no SPA.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-5 z-50 px-4 max-w-5xl mx-auto w-full" data-gsap="header">
      <nav aria-label="Main" className="glass-pill rounded-full px-5 py-2.5 flex items-center justify-between shadow-2xl transition-all duration-300">
        <a className="block transition-opacity duration-200 hover:opacity-80" href="/" aria-label={`${BRAND} home`}>
          <Logo height={36} />
        </a>
        <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-secondary">
          <a className="hover:text-white transition-colors duration-150" href="/#how-it-works">How it Works</a>
          <a className="hover:text-white transition-colors duration-150" href="/#features">Why Us</a>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            className="px-4 py-2 rounded-full bg-white text-surface text-[13px] font-semibold flex items-center gap-1.5 hover:bg-neutral-200 transition-colors duration-200 shadow-md active:scale-95"
            href="/#waitlist"
            data-magnetic
          >
            <span>Join Waitlist</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
