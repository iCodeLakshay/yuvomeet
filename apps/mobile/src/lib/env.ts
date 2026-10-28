/** Public build-time config. Only EXPO_PUBLIC_* values ever reach the app (S-2). */
export const env = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  // Publishable key (sb_publishable_…) or legacy anon key; both are safe to ship.
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  /** Grievance / support contact and policy site (privacy §4). */
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@yuvomeet.app',
  siteUrl: process.env.EXPO_PUBLIC_SITE_URL ?? 'https://yuvomeet.app',
} as const;
