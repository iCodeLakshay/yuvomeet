// Razorpay Payment Links (integrations.md §Razorpay). Checkout happens on Razorpay's hosted
// page in the system browser, so no card or UPI data ever touches the app or our servers.
// Only the amount, a description and our payment id are sent; no profile data.
import { hmacSha256Hex, requireSecret, safeEqual } from './crypto.ts';

const API = 'https://api.razorpay.com/v1';

export const isConfigured = () => Boolean(Deno.env.get('RAZORPAY_KEY_ID') && Deno.env.get('RAZORPAY_KEY_SECRET'));

function auth() {
  return `Basic ${btoa(`${requireSecret('RAZORPAY_KEY_ID')}:${requireSecret('RAZORPAY_KEY_SECRET')}`)}`;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: auth(), 'Content-Type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Razorpay ${path} ${res.status}`);
  return (await res.json()) as T;
}

export interface PaymentLink {
  id: string;
  short_url: string;
  status: 'created' | 'partially_paid' | 'expired' | 'cancelled' | 'paid';
  reference_id: string;
  payments?: { payment_id: string; status: string }[] | null;
}

export function createPaymentLink(input: { paymentId: string; amountPaise: number; description: string; callbackUrl: string }) {
  return call<PaymentLink>('/payment_links', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      accept_partial: false,
      reference_id: input.paymentId,
      description: input.description,
      notify: { sms: false, email: false },
      reminder_enable: false,
      callback_url: input.callbackUrl,
      callback_method: 'get',
      expire_by: Math.floor(Date.now() / 1000) + 30 * 60,
      notes: { payment_id: input.paymentId },
    }),
  });
}

export const fetchPaymentLink = (id: string) => call<PaymentLink>(`/payment_links/${encodeURIComponent(id)}`);

/** X-Razorpay-Signature is HMAC-SHA256 of the raw body with the webhook secret. */
export async function verifyWebhook(raw: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const expected = await hmacSha256Hex(requireSecret('RAZORPAY_WEBHOOK_SECRET'), raw);
  return safeEqual(expected, signature);
}

export interface Refund {
  id: string;
  status: string;
}

/** Full refund of a captured payment; Razorpay de-duplicates by receipt. */
export function refundPayment(razorpayPaymentId: string, amountPaise: number, receipt: string) {
  return call<Refund>(`/payments/${encodeURIComponent(razorpayPaymentId)}/refund`, {
    method: 'POST',
    body: JSON.stringify({ amount: amountPaise, speed: 'normal', receipt }),
  });
}
