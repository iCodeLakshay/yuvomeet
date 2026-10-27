/**
 * Stitch Visual Design System Tokens
 * Project: Yuvomeet Mobile App (projects/8524346772271803736)
 * Theme: Electric Campus Underground + Liquid Glass
 *
 * Also hoists `Intl.DateTimeFormat` instances at module scope per `js-hoist-intl`
 * in vercel-react-native-skills to avoid expensive formatter creation inside renders.
 */

export const Colors = {
  // Base Obsidian & Abyssal Surfaces (from Stitch HTML frames & DESIGN.md)
  canvasLowest: '#07080C',
  background: '#0D0E13',
  surface: '#121318',
  surfaceLow: '#181920',
  surfaceContainer: '#1E1F25',
  surfaceHigh: '#292A2F',
  surfaceBright: '#38393F',

  // Primary & Kinetic Accents
  primaryWhite: '#FFFFFF',
  onPrimaryDark: '#121318',
  electricLime: '#C6FF3D',
  onElectricLime: '#0E0F1A',
  electricViolet: '#8B5CF6',
  secondarySilver: '#C4C6D2',
  trustEmerald: '#10B981',
  trustEmeraldBg: 'rgba(16, 185, 129, 0.14)',
  trustEmeraldBorder: 'rgba(16, 185, 129, 0.35)',

  // Text & Borders
  textPrimary: '#E3E1E9',
  textSecondary: '#C5C7C9',
  textMuted: '#8F9194',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderElevated: 'rgba(255, 255, 255, 0.14)',
  borderLime: 'rgba(198, 255, 61, 0.45)',
  glassSurface: 'rgba(22, 23, 30, 0.78)',

  // Status
  warningAmber: '#FBBF24',
  warningAmberBg: 'rgba(251, 191, 36, 0.14)',
  errorCoral: '#FFB4AB',
  errorContainer: '#93000A',
  sosRed: '#EF4444',
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  DEFAULT: 16,
  card: 22,
  sheet: 32,
  pill: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  touchMin: 48, // NFR: tap targets at least 44px (ideal 48px per Stitch DESIGN.md)
} as const;

// Hoisted Intl formatters (Rule: js-hoist-intl)
const istDayTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const istTimeOnlyFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const istDateOnlyFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export function formatPlanDateTime(isoString: string): string {
  try {
    return istDayTimeFormatter.format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    return istTimeOnlyFormatter.format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  try {
    return istDateOnlyFormatter.format(new Date(isoString));
  } catch {
    return isoString;
  }
}
