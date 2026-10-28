// Transactional email through Resend. Used only for the account-deletion code.
// The address is used to deliver the message and is never logged.
import { requireSecret } from './crypto.ts';

export const isConfigured = () => Boolean(Deno.env.get('RESEND_API_KEY'));

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireSecret('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('EMAIL_FROM') ?? 'Yuvomeet <no-reply@yuvomeet.app>', to: [to], subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Email delivery failed ${res.status}`);
}
