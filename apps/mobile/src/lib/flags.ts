/**
 * Paywall switch. While it is off (the default) nobody meets a payment screen or a
 * subscription limit: Plus / Premium is hidden and its route redirects away, the free-tier
 * weekly caps are not shown, and hosts cannot create paid plans.
 *
 * Nothing is deleted: the checkout, entitlement and earnings code all stays. To bring the
 * paywall back set EXPO_PUBLIC_PAYWALL=on for the build, and restore the weekly caps on the
 * server (see supabase/migrations/20261029000001_paywall_skip.sql, which has the revert).
 */
export const PAYWALL_ENABLED = process.env.EXPO_PUBLIC_PAYWALL === 'on';
