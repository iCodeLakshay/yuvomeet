// ON-6: immediate effects (sessions revoked, profile hidden, joins withdrawn, hosted plans
// cancelled), purge scheduled within 30 days, analytics person deleted (privacy §3).
// Two steps: `send` emails a 6-digit code, `confirm` checks it and deletes the account.
// Codes are stored only as an HMAC and expire after 10 minutes.
import { hmacSha256Hex, requireSecret } from '../_shared/crypto.ts';
import * as email from '../_shared/email.ts';
import { HttpError, isLocal, json, readJson, serve } from '../_shared/http.ts';
import { admin, rateLimit, requireUser, unwrap } from '../_shared/supabase.ts';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

async function deletePostHogPerson(userId: string) {
  const key = Deno.env.get('POSTHOG_PERSONAL_API_KEY');
  const project = Deno.env.get('POSTHOG_PROJECT_ID');
  if (!key || !project) return;
  const host = Deno.env.get('POSTHOG_API_HOST') ?? 'https://eu.posthog.com';
  await fetch(`${host}/api/projects/${project}/persons/bulk_delete/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ distinct_ids: [userId] }),
  }).catch(() => undefined);
}

const codeHmac = (userId: string, code: string) => hmacSha256Hex(requireSecret('OTP_PEPPER'), `delete:${userId}:${code}`);

function maskEmail(address: string) {
  const [name, domain] = address.split('@');
  return `${name!.slice(0, 2)}${'•'.repeat(Math.max(1, name!.length - 2))}@${domain}`;
}

serve(async (req) => {
  const userId = await requireUser(req);
  const body = await readJson<{ action?: 'send' | 'confirm'; email?: string; code?: string }>(req);

  if (body.action === 'send') {
    await rateLimit(userId, 'delete-account-send', 3_600, 5);
    const { data } = await admin.auth.admin.getUserById(userId);
    // A confirmed account email wins; otherwise the user names the inbox to receive the code.
    const target = (data.user?.email_confirmed_at ? data.user.email : null) ?? body.email?.trim().toLowerCase() ?? '';
    if (!EMAIL.test(target)) throw new HttpError(400, 'BAD_EMAIL', 'Enter a valid email address.');

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, '0');
    unwrap(await admin.rpc('svc_deletion_code_store', { p_user: userId, p_code_hmac: await codeHmac(userId, code), p_email: target }));
    if (email.isConfigured()) {
      await email.sendEmail(
        target,
        'Your Yuvomeet account deletion code',
        `Your code to delete your Yuvomeet account is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for this, ignore this email and your account stays as it is.`,
      );
    } else if (!isLocal()) {
      throw new HttpError(503, 'EMAIL_UNAVAILABLE', "We couldn't send the code. Contact support to delete your account.");
    }
    return json({ sent_to: maskEmail(target), ...(isLocal() && !email.isConfigured() ? { dev_code: code } : {}) });
  }

  if (body.action === 'confirm') {
    await rateLimit(userId, 'delete-account-confirm', 3_600, 20);
    if (!/^\d{6}$/.test(body.code ?? '')) throw new HttpError(400, 'BAD_REQUEST', 'Enter the 6-digit code.');
    const result = unwrap(await admin.rpc('svc_deletion_code_check', { p_user: userId, p_code_hmac: await codeHmac(userId, body.code!) }));
    if (result === 'invalid') throw new HttpError(401, 'INVALID_OTP', 'That code is not right.');
    if (result === 'locked') throw new HttpError(429, 'OTP_LOCKED', 'Too many wrong codes. Request a new one.');
    if (result !== 'ok') throw new HttpError(410, 'OTP_EXPIRED', 'That code expired. Request a new one.');

    const purgeAfter = unwrap(await admin.rpc('svc_request_deletion', { p_user: userId }));
    await deletePostHogPerson(userId);
    return json({ purge_after: purgeAfter });
  }

  throw new HttpError(400, 'BAD_REQUEST', 'Invalid request.');
});
