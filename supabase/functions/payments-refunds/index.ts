// Internal: refunds paid plan seats that were lost (plan cancelled, member removed, seat
// released). Called by Postgres through pg_net with the internal secret; safe to rerun.
import { requireSecret, safeEqual } from '../_shared/crypto.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import * as razorpay from '../_shared/razorpay.ts';
import { admin, unwrap } from '../_shared/supabase.ts';

serve(async (req) => {
  if (!safeEqual(req.headers.get('x-internal-secret') ?? '', requireSecret('INTERNAL_SECRET'))) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');
  }
  const pending =
    unwrap(await admin.from('payments').select('id, amount_paise, razorpay_payment_id').eq('status', 'refund_pending').limit(50)) ?? [];
  let refunded = 0;
  for (const p of pending) {
    try {
      // Stubbed local payments never reached Razorpay; nothing to send back.
      const refund = p.razorpay_payment_id && razorpay.isConfigured()
        ? await razorpay.refundPayment(p.razorpay_payment_id, p.amount_paise, p.id)
        : { id: 'local' };
      unwrap(await admin.rpc('svc_refund_done', { p_payment: p.id, p_refund_id: refund.id }));
      refunded++;
    } catch (e) {
      console.error('refund failed', p.id, e instanceof Error ? e.message : e);
    }
  }
  return json({ refunded, pending: pending.length - refunded });
});
