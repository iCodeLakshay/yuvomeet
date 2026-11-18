import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { Motion } from '@/components/Motion';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { BRAND, DESCRIPTION, SITE_URL } from '@/content/site';
import './globals.css';

// The whole site is set in Inter, as in the Stitch design. next/font self-hosts the face.
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'], variable: '--font-inter', display: 'swap' });

// Material Symbols, subset to the glyphs the site uses (alphabetical, as Google Fonts' icon_names requires).
const ICONS = [
  'arrow_forward', 'bolt', 'cancel', 'check', 'check_circle', 'chevron_right', 'do_not_disturb_on', 'explore',
  'forum', 'gavel', 'group', 'groups', 'lock', 'mail', 'offline_bolt', 'photo_camera', 'psychology', 'public',
  'schedule', 'shield', 'shield_person', 'stars', 'sync', 'trending_down', 'verified', 'verified_user',
].join(',');
const ICON_CSS = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=${ICONS}&display=block`;

const TITLE = `${BRAND} — Real people. Real plans. Skip the swiping.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s · ${BRAND}` },
  description: DESCRIPTION,
  applicationName: BRAND,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: BRAND, locale: 'en_IN', url: '/', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#06070a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={ICON_CSS} />
      </head>
      <body className="ym">
        <a className="skip-link" href="#main">Skip to content</a>
        {/* Ambient dark vignette and aura (no grid). GSAP drifts the three glows slowly. */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div data-aura className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] bg-[radial-gradient(ellipse_at_top,rgba(180,140,222,0.12),transparent_70%)] blur-3xl" />
          <div data-aura className="absolute top-[35%] left-[-12%] w-[650px] h-[650px] bg-[radial-gradient(circle,rgba(245,158,11,0.03),transparent_70%)] blur-3xl" />
          <div data-aura className="absolute top-[50%] right-[-10%] w-[750px] h-[750px] bg-[radial-gradient(circle,rgba(16,185,129,0.035),transparent_70%)] blur-3xl" />
          <div className="absolute bottom-0 inset-x-0 h-[500px] bg-gradient-to-t from-[#030406] via-[#050608]/80 to-transparent" />
        </div>
        <div className="relative z-10 min-h-screen flex flex-col justify-between">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
        <Motion />
      </body>
    </html>
  );
}
