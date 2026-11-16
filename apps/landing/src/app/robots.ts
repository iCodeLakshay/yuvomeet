import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/content/site';

export const dynamic = 'force-static';

/**
 * Everything is public and meant to be found, including by answer engines, so no crawler is
 * blocked. Training opt-outs (Google-Extended, GPTBot and the like) are a business decision for the
 * owner, not a default; see docs/seo/README.md.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
