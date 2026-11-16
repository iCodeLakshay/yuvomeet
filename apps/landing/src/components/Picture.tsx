import { IMAGES, type ImageName } from '@/content/images.generated';

interface PictureProps {
  name: ImageName;
  alt: string;
  /** The `sizes` attribute: how wide the picture renders at each breakpoint. */
  sizes: string;
  className?: string;
  /** Above the fold: load eagerly with high priority (the LCP candidate). */
  priority?: boolean;
}

/**
 * AVIF first, WebP as the fallback, from the sizes scripts/images.mjs generated. Width and height come
 * from the source so the browser reserves the box before the file arrives (no layout shift).
 */
export function Picture({ name, alt, sizes, className, priority = false }: PictureProps) {
  const img = IMAGES[name];
  const srcset = (ext: 'avif' | 'webp') => img.widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ');
  const fallback = `/img/${name}-${img.widths[Math.min(1, img.widths.length - 1)]}.webp`;
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={srcset('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset('webp')} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={img.width}
        height={img.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </picture>
  );
}
