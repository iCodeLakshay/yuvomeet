import { ImageResponse } from 'next/og';
import { BRAND } from '@/content/site';
import { MarkArt } from '@/lib/brand-art';

export const dynamic = 'force-static';
export const alt = `${BRAND}: Real people. Real plans. Skip the swiping.`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The share card, drawn at build time in the site's look: the mark, the headline and the promise. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: 'radial-gradient(ellipse at 50% -10%, rgba(180,140,222,0.28), #06070a 60%)',
          color: '#f1f1f6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <MarkArt size={88} />
          <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1.5 }}>hengout</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 84, fontWeight: 800, lineHeight: 1.04, letterSpacing: -3.5 }}>
            <span>Real people. Real plans.</span>
            <span style={{ color: 'rgba(255,255,255,0.62)' }}>Skip the swiping.</span>
          </div>
          <div style={{ fontSize: 30, color: '#9fa2b4' }}>Verified members · Small groups · Public venues · Plans tonight</div>
        </div>
      </div>
    ),
    size,
  );
}
