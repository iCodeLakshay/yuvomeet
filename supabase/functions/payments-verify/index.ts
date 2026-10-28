// Called by the app when the Razorpay page closes. Asks Razorpay directly (server to server)
// whether the link was paid; the browser redirect itself is never trusted.
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import * as razorpay from '../_shared/razorpay.ts';
import { admin, rateLimit, requireUser, unwrap } from '../_shared/supabase.ts';

serve(async (req) => {
  const userId = await requireUser(req);
  await rateLimit(userId, 'payments-verify', 3_600, 60);
  const { paymentId } = await readJson<{ paymentId?: string }>(req);
  if (!/^[0-9a-f-]{36}$/.test(paymentId ?? '')) throw new HttpError(400, 'BAD_REQUEST', 'Payment not found.');
  const payment = unwrap(
    await admin.from('payments').select('id, status, razorpay_link_id').eq('id', paymentId!).eq('user_id', userId).maybeSingle(),
  );
  if (!payment) throw new HttpError(404, 'NOT_FOUND', 'Payment not found.');
  if (payment.status === 'paid') return json({ status: 'paid' });
  if (!payment.razorpay_link_id || !razorpay.isConfigured()) return json({ status: payment.status });

  const link = await razorpay.fetchPaymentLink(payment.razorpay_link_id);
  if (link.status === 'paid' && link.reference_id === payment.id) {
    const paid = link.payments?.find((p) => p.status === 'captured');
    unwrap(await admin.rpc('svc_apply_payment', { p_payment: payment.id, p_razorpay_payment_id: paid?.payment_id ?? null }));
    return json({ status: 'paid' });
  }
  if (link.status === 'expired' || link.status === 'cancelled') {
    unwrap(await admin.from('payments').update({ status: 'expired' }).eq('id', payment.id).eq('status', 'created'));
    return json({ status: 'expired' });
  }
  return json({ status: 'created' });
});
