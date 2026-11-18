import { BRAND, INSTAGRAM_URL, SUPPORT_EMAIL } from '@/content/site';
import { Logo } from './Logo';

const LINK = 'hover:text-white transition-colors duration-150';
const SOCIAL =
  'w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-secondary hover:text-white transition-colors';

/** Minimal glass footer from the Stitch design, with the legal pages and the Instagram handle wired in. */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#030406]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
            <a className="block transition-opacity duration-200 hover:opacity-80" href="/" aria-label={`${BRAND} home`}>
              <Logo height={28} />
            </a>
            <span className="hidden sm:inline text-white/10">•</span>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[11px] text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Verified Neighborhood Circles</span>
            </div>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-secondary font-medium">
            <a className={LINK} href="/#how-it-works">How it Works</a>
            <a className={LINK} href="/community-guidelines/">Safety</a>
            <a className={LINK} href="/legal/#privacy">Privacy</a>
            <a className={LINK} href="/legal/#terms">Terms</a>
            <a className={LINK} href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <a className={SOCIAL} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" title="Instagram" aria-label={`${BRAND} on Instagram`}>
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">photo_camera</span>
            </a>
            <a className={SOCIAL} href={`mailto:${SUPPORT_EMAIL}`} title="Email us" aria-label={`Email ${BRAND}`}>
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">forum</span>
            </a>
          </div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-secondary">
          <p className="text-[11px] text-neutral-400 font-normal">
            © {new Date().getFullYear()} {BRAND}. The offline-first community for genuine gatherings.
          </p>
          <div className="flex items-center gap-1 text-[11px] text-secondary">
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">public</span>
            <span>Global • EN</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
