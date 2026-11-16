import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/content/site';

export const dynamic = 'force-static';

/** Every indexable page. URLs end in "/" to match trailingSlash: true, so canonicals and sitemap agree. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/community-guidelines/`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
