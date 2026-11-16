import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const alt = 'Hengout: small group plans in Kota for verified adults';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The share card, drawn at build time: the mark, the category line and the hard facts. */
export default async function OpengraphImage() {
  const mark = await readFile(path.join(process.cwd(), 'public', 'img', 'mark-256.png'));
  const src = `data:image/png;base64,${mark.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 80, background: '#121318', color: '#e3e1e9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={104} height={104} alt="" />
          <div style={{ fontSize: 48, letterSpacing: -1 }}>hengout</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2.5, maxWidth: 900 }}>Small group plans in Kota for verified adults</div>
          <div style={{ fontSize: 30, color: '#c5c7c9' }}>Groups of 3 to 10 · Approved public venues · ID and selfie checked</div>
        </div>
      </div>
    ),
    size,
  );
}
