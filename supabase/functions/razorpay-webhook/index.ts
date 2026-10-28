// Razorpay webhook (payment_link.paid): the source of truth if the app closes before
// payments-verify runs. Signature checked on the raw body; replays dropped by event id.
import { HttpError, json, serve } from '../_shared/http.ts';
import * as razorpay from '../_shared/razorpay.ts';
import { admin, unwrap } from '../_shared/supabase.ts';

interface Event {
  event?: string;
  payload?: {
    payment_link?: { entity?: { id?: string; reference_id?: string } };
    payment?: { entity?: { id?: string } };
  };
}

serve(async (req) => {
  const raw = await req.text();
  if (!(await razorpay.verifyWebhook(raw, req.headers.get('x-razorpay-signature')))) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid signature');
  }
  const event = JSON.parse(raw) as Event;
  if (event.event !== 'payment_link.paid') return json({ ok: true, ignored: true });

  const eventId = req.headers.get('x-razorpay-event-id');
  if (eventId) {
    const { error: replay } = await admin.rpc('svc_webhook_seen', { p_provider: 'razorpay', p_event_id: eventId });
    if (replay) return json({ ok: true, duplicate: true });
  }

  const link = event.payload?.payment_link?.entity;
  const paymentId = link?.reference_id;
  if (!paymentId) throw new HttpError(400, 'BAD_REQUEST', 'Missing reference');
  const payment = unwrap(await admin.from('payments').select('id, razorpay_link_id').eq('id', paymentId).maybeSingle());
  if (!payment || payment.razorpay_link_id !== link?.id) throw new HttpError(404, 'NOT_FOUND', 'Unknown payment');

  unwrap(await admin.rpc('svc_apply_payment', { p_payment: payment.id, p_razorpay_payment_id: event.payload?.payment?.entity?.id ?? null }));
  return json({ ok: true });
});
