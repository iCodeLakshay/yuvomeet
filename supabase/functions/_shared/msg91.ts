// MSG91 OTP delivery on the DLT-registered template (integrations.md §MSG91).
// Only the phone number and the code are sent. 5 s timeout, one retry.
import { requireSecret } from './crypto.ts';

export const isConfigured = () => Boolean(Deno.env.get('MSG91_AUTH_KEY'));

export async function sendOtp(phoneE164: string, otp: string): Promise<void> {
  const body = JSON.stringify({
    template_id: requireSecret('MSG91_TEMPLATE_ID'),
    short_url: '0',
    recipients: [{ mobiles: phoneE164.replace(/^\+/, ''), otp }],
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('https://control.msg91.com/api/v5/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: requireSecret('MSG91_AUTH_KEY') },
        body,
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) return;
    } catch {
      // timeout or network error: retry once
    }
  }
  throw new Error('MSG91 delivery failed');
}
