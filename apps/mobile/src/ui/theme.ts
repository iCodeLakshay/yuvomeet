/**
 * Design tokens from the Stitch project "Yuvomeet Mobile App" (dark, Inter, white primary,
 * amber accent). Every screen styles through these; no raw colours elsewhere.
 */

export const colors = {
  bg: '#121318',
  bgDeep: '#0D0E13',
  surface1: '#1A1B21',
  surface2: '#1E1F25',
  surface3: '#292A2F',
  surface4: '#34343A',
  text: '#E3E1E9',
  textMuted: '#C5C7C9',
  textSubtle: '#8F9194',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  primary: '#FFFFFF',
  onPrimary: '#121318',
  accent: '#EAB308',
  accentSoft: 'rgba(234, 179, 8, 0.14)',
  /** The one icon accent: tab bar, bell, selections, verified badge. Secondary icons stay textMuted / textSubtle. */
  brand: '#38BDF8',
  brandSoft: 'rgba(56, 189, 248, 0.14)',
  success: '#34D399',
  successBg: 'rgba(16, 185, 129, 0.14)',
  successBorder: 'rgba(16, 185, 129, 0.35)',
  warning: '#FCD34D',
  warningBg: 'rgba(245, 158, 11, 0.14)',
  danger: '#FFB4AB',
  dangerBg: 'rgba(147, 0, 10, 0.35)',
  sos: '#EF4444',
  /** Frosted-glass dock: body tint, bright rim, and the selected tab's bubble. */
  glassTint: 'rgba(255, 255, 255, 0.06)',
  glassEdge: 'rgba(255, 255, 255, 0.28)',
  glassActive: 'rgba(255, 255, 255, 0.16)',
  scrim: 'rgba(13, 14, 19, 0.72)',
  overlay: 'rgba(18, 19, 24, 0.55)',
} as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

/** Screen side padding used across Stitch frames. */
export const gutter = space.xl;

/** Minimum tap target (NFR: at least 44 px). */
export const touch = 44;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  title2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  title3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  /** Secondary actions inside cards: quieter than the card's title and detail lines. */
  buttonCompact: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
} as const;

export type TypeVariant = keyof typeof type;
export type ColorToken = keyof typeof colors;
