/**
 * The Hengout wordmark: the icon and the name in one image (public/hengout.png, 720x227, cream on
 * transparent, made for dark grounds). The same file the admin console uses.
 */
export function Logo({ height = 32 }: { height?: number }) {
  // A plain <img>: the static export has no image optimiser, and this one file is already small.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/hengout.png" width={Math.round((height * 720) / 227)} height={height} alt="Hengout" decoding="async" style={{ display: 'block', height, width: 'auto' }} />;
}
