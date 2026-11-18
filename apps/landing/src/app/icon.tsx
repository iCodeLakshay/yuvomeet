import { ImageResponse } from 'next/og';
import { MarkArt } from '@/lib/brand-art';

export const dynamic = 'force-static';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** Favicon and PWA icon, drawn at build time (no image file in the repo). */
export default function Icon() {
  return new ImageResponse(<MarkArt size={512} />, size);
}
