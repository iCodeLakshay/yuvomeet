import googleAuthenticator from '@thesvg/icons/google-authenticator';
import razorpay from '@thesvg/icons/razorpay';
import sentry from '@thesvg/icons/sentry';
import supabase from '@thesvg/icons/supabase';
import upi from '@thesvg/icons/upi';

/**
 * Brand logos from thesvg.org (@thesvg/icons), used only where a third-party service appears.
 * Per-icon imports keep the bundle small. The "mono" variant takes the text colour (fill: currentColor
 * in globals.css), so logos sit quietly in the dark palette. The SVG strings come from the package at
 * build time, never from user input, so inlining them is safe.
 */
const BRANDS = { razorpay, upi, supabase, sentry, googleAuthenticator };

export type BrandName = keyof typeof BRANDS;

export function Brand({ name, size = 16, label }: { name: BrandName; size?: number; label?: string }) {
  const icon = BRANDS[name];
  const svg = icon.variants.mono ?? icon.svg;
  return (
    <span
      className="brandicon"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
