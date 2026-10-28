/**
 * Premium passes sold through Razorpay. The Edge Function `payments-checkout` charges the
 * amount from this table, so the app can never pick its own price. One price for everyone.
 */

export type PaidTier = 'plus' | 'premium';

export interface PremiumProduct {
  id: string;
  tier: PaidTier;
  days: number;
  amountPaise: number;
  label: string;
  /** Shown under the price, e.g. "Save 16%". */
  note?: string;
}

export const PREMIUM_PRODUCTS: readonly PremiumProduct[] = [
  { id: 'plus_1m', tier: 'plus', days: 30, amountPaise: 19_900, label: '1 month' },
  { id: 'plus_3m', tier: 'plus', days: 90, amountPaise: 49_900, label: '3 months', note: 'Save 16%' },
  { id: 'premium_1m', tier: 'premium', days: 30, amountPaise: 49_900, label: '1 month' },
  { id: 'premium_3m', tier: 'premium', days: 90, amountPaise: 119_900, label: '3 months', note: 'Save 20%' },
];

export const findPremiumProduct = (id: string) => PREMIUM_PRODUCTS.find((p) => p.id === id);

/** Perks per tier; the server enforces each one (caps in RPCs, priority/boost in views). */
export const TIER_PERKS: Record<PaidTier, readonly string[]> = {
  plus: ['Unlimited plan joins every week', 'Host as many plans as you like'],
  premium: [
    'Everything in Plus',
    'Priority requests: you show first to hosts',
    'Boosted plans: yours show first in the feed',
    'Premium badge on your requests',
  ],
};

export const formatRupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

/** Paid plans: the platform keeps this share of each seat (server setting platform_fee_bps). */
export const PLATFORM_FEE_BPS = 1000;
export const PLAN_PRICE_MIN_RUPEES = 49;
export const PLAN_PRICE_MAX_RUPEES = 5000;

/** Fee and host share for one seat, in paise. Mirrors payments-checkout. */
export function splitSeat(pricePaise: number, feeBps = PLATFORM_FEE_BPS) {
  const fee = Math.floor((pricePaise * feeBps) / 10_000);
  return { fee, host: pricePaise - fee };
}
