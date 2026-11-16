/** The Hengout wordmark (icon + name in one image, public/hengout.png, 720×227). */
export function Logo({ height = 32 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/hengout.png" width={Math.round((height * 720) / 227)} height={height} alt="Hengout" className="logo" />;
}

/** The square app icon alone (public/mark.png), for tight spots. */
export function Mark({ size = 20 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/mark.png" width={size} height={size} alt="" aria-hidden="true" style={{ display: 'block', borderRadius: size * 0.225 }} />;
}
