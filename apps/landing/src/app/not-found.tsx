import type { Metadata } from 'next';

// Next marks this page noindex itself; a second robots tag would only conflict.
export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main id="main" className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-24 md:pt-32 pb-24 text-center flex flex-col items-center">
      <p className="font-mono text-xs text-neutral-500 mb-4">404</p>
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight hero-title-gradient mb-3">This page is not here</h1>
      <p className="text-sm sm:text-base text-secondary mb-8">The link may be old, or the address may have a typo.</p>
      <a className="px-5 py-3 rounded-xl bg-white text-surface text-sm font-semibold flex items-center gap-1.5 hover:bg-neutral-100 transition-colors shadow-lg" href="/" data-magnetic>
        Go to the home page
        <span aria-hidden="true" className="material-symbols-outlined text-[17px]">arrow_forward</span>
      </a>
    </main>
  );
}
