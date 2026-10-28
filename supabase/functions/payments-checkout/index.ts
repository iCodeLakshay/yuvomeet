// Checkout for a Premium pass or a seat on a paid plan. The server sets the amount, records
// the payment and returns a Razorpay Payment Link for the app to open. Nothing changes until
// payments-verify or razorpay-webhook confirms the payment with Razorpay.
import { findPremiumProduct, formatRupees } from '../../../packages/shared/src/premium.ts';
import { HttpError, isLocal, json, readJson, serve } from '../_shared/http.ts';
import * as razorpay from '../_shared/razorpay.ts';
import { admin, rateLimit, requireUser, unwrap } from '../_shared/supabase.ts';

type Insert = {
  user_id: string;
  product_id: string;
  amount_paise: number;
  kind: 'premium' | 'plan';
  tier?: 'plus' | 'premium';
  days?: number;
  plan_id?: string;
  host_id?: string | null;
  platform_fee_paise?: number;
  host_payout_paise?: number;
};

async function planSeat(userId: string, planId: string): Promise<{ row: Insert; description: string }> {
  if (!/^[0-9a-f-]{36}$/.test(planId)) throw new HttpError(400, 'BAD_REQUEST', 'Plan not found.');
  const plan = unwrap(
    await admin.from('plans').select('id, title, host_id, price_paise, status').eq('id', planId).maybeSingle(),
  );
  if (!plan || !plan.price_paise) throw new HttpError(404, 'NOT_FOUND', 'This plan is free.');
  if (plan.status !== 'open' && plan.status !== 'full') throw new HttpError(409, 'CLOSED', 'This plan is no longer taking payments.');
  const member = unwrap(
    await admin.from('plan_members').select('status, paid_at').eq('plan_id', planId).eq('user_id', userId).maybeSingle(),
  );
  if (!member || member.status !== 'approved') throw new HttpError(403, 'FORBIDDEN', 'The host has to approve you before you pay.');
  if (member.paid_at) throw new HttpError(409, 'ALREADY_PAID', 'Your seat is already paid.');

  const bps = Number(unwrap(await admin.rpc('svc_setting', { p_key: 'platform_fee_bps' })) ?? 1000);
  const fee = Math.floor((plan.price_paise * bps) / 10_000);
  return {
    row: {
      user_id: userId,
      product_id: 'plan_seat',
      kind: 'plan',
      amount_paise: plan.price_paise,
      plan_id: plan.id,
      host_id: plan.host_id,
      platform_fee_paise: fee,
      host_payout_paise: plan.price_paise - fee,
    },
    description: `Yuvomeet seat · ${plan.title.slice(0, 60)} · ${formatRupees(plan.price_paise)}`,
  };
}

serve(async (req) => {
  const userId = await requireUser(req);
  await rateLimit(userId, 'payments-checkout', 3_600, 20);
  const { productId, planId } = await readJson<{ productId?: string; planId?: string }>(req);

  const profile = unwrap(await admin.from('profiles').select('status').eq('id', userId).single())!;
  if (profile.status !== 'active') throw new HttpError(403, 'FORBIDDEN', "This account can't make payments right now.");

  let row: Insert;
  let description: string;
  if (planId) {
    ({ row, description } = await planSeat(userId, planId));
  } else {
    const product = findPremiumProduct(productId ?? '');
    if (!product) throw new HttpError(400, 'BAD_REQUEST', 'Pick a plan.');
    row = { user_id: userId, product_id: product.id, kind: 'premium', tier: product.tier, days: product.days, amount_paise: product.amountPaise };
    description = `Yuvomeet ${product.tier === 'premium' ? 'Premium' : 'Plus'} · ${product.label} · ${formatRupees(product.amountPaise)}`;
  }

  const payment = unwrap(await admin.from('payments').insert(row).select('id').single())!;

  if (!razorpay.isConfigured()) {
    // Local development only: PAYMENTS_STUB=approve confirms without Razorpay.
    if (isLocal() && Deno.env.get('PAYMENTS_STUB') === 'approve') {
      unwrap(await admin.rpc('svc_apply_payment', { p_payment: payment.id, p_razorpay_payment_id: null }));
      return json({ payment_id: payment.id, url: null, paid: true });
    }
    throw new HttpError(503, 'PAYMENTS_UNAVAILABLE', 'Payments are not available yet. Try again later.');
  }

  const base = Deno.env.get('SUPABASE_URL') ?? '';
  const link = await razorpay.createPaymentLink({
    paymentId: payment.id,
    amountPaise: row.amount_paise,
    description,
    callbackUrl: Deno.env.get('PAYMENTS_RETURN_URL') ?? `${base}/functions/v1/payments-return`,
  });
  unwrap(await admin.from('payments').update({ razorpay_link_id: link.id }).eq('id', payment.id));
  return json({ payment_id: payment.id, url: link.short_url, paid: false });
});
