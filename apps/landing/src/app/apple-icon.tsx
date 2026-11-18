import { ImageResponse } from 'next/og';
import { MarkArt } from '@/lib/brand-art';

export const dynamic = 'force-static';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS home-screen icon, drawn at build time. iOS rounds the corners itself, so the ground is square. */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: 180, height: 180, display: 'flex', background: '#090a0f' }}>
      <MarkArt size={180} />
    </div>,
    size,
  );
}
