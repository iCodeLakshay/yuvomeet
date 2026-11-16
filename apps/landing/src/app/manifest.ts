import type { MetadataRoute } from 'next';
import { BRAND, DESCRIPTION } from '@/content/site';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND,
    short_name: BRAND,
    description: DESCRIPTION,
    start_url: '/',
    display: 'browser',
    background_color: '#121318',
    theme_color: '#121318',
    icons: [
      { src: '/img/mark-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/img/mark-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
