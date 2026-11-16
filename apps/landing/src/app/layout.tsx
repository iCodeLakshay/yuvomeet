import type { Metadata, Viewport } from 'next';
import { Epilogue } from 'next/font/google';
import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Motion } from '@/components/Motion';
import { Nav } from '@/components/Nav';
import { BRAND, DESCRIPTION, SITE_URL } from '@/content/site';
import './globals.css';
import './phone.css';

// Dealt by tasteskill (start.mjs, pairing "epilogue"). The pairing's mono is left out: it cost a font
// request for a few numerals, which Epilogue sets in tabular figures. next/font self-hosts the face.
const epilogue = Epilogue({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-epilogue', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND}: small group plans in Kota for verified adults`, template: `%s · ${BRAND}` },
  description: DESCRIPTION,
  applicationName: BRAND,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: BRAND,
    locale: 'en_IN',
    url: '/',
    title: `${BRAND}: small group plans in Kota for verified adults`,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#121318',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" data-type="software" className={epilogue.variable}>
      <head>
        <meta name="page-type" content="software" />
        <meta name="site-kind" content="software" />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Nav />
        {children}
        <Footer />
        <Motion />
      </body>
    </html>
  );
}
