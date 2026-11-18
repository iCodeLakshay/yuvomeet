/*
 * The Hengout mark, drawn in code for next/og (ImageResponse) so the site ships no image files:
 * a white "h" on the design's near-black ground, lit by its violet aura. Inline styles only (satori).
 */
export function MarkArt({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 0%, rgba(180,140,222,0.45), #090a0f 70%)',
        borderRadius: size * 0.225,
        color: '#ffffff',
        fontSize: size * 0.62,
        fontWeight: 800,
        letterSpacing: -size * 0.02,
        lineHeight: 1,
        paddingBottom: size * 0.06,
      }}
    >
      h
    </div>
  );
}
