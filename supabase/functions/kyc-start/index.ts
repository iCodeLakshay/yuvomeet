// VR-1 to VR-3, S-38: starts a paid HyperVerge check, or routes to manual review after the
// retry limit (VR-2). Local development without credentials applies a passing stub result.
import * as hyperverge from '../_shared/hyperverge.ts';
import { HttpError, isLocal, json, serve } from '../_shared/http.ts';
import { admin, rateLimit, requireUser, unwrap } from '../_shared/supabase.ts';

interface Prepared {
  action: 'start' | 'already_verified' | 'manual_review' | 'blocked_minor' | 'busy' | 'denied';
  attempt?: number;
  photo_path?: string;
  declared_gender?: 'woman' | 'man' | 'other';
  message?: string;
}

serve(async (req) => {
  const userId = await requireUser(req);
  await rateLimit(userId, 'kyc-start', 86_400, 5);

  const prepared = unwrap(await admin.rpc('svc_kyc_prepare', { p_user: userId })) as unknown as Prepared;
  if (prepared.action === 'denied' || prepared.action === 'busy') {
    throw new HttpError(409, prepared.action.toUpperCase(), prepared.message ?? 'Verification is unavailable.');
  }
  if (prepared.action !== 'start') return json({ status: prepared.action });

  const transactionId = crypto.randomUUID();
  unwrap(await admin.rpc('svc_kyc_register', { p_user: userId, p_transaction_id: transactionId, p_attempt: prepared.attempt! }));

  if (!hyperverge.isConfigured()) {
    if (!isLocal()) throw new Error('HyperVerge is not configured');
    const result = unwrap(await admin.rpc('svc_kyc_apply', {
      p_result: {
        transaction_id: transactionId,
        fingerprint: `local-${userId}`,
        birth_year: 2000,
        gender: prepared.declared_gender ?? 'other',
        face_score: 95,
        liveness_score: 95,
        id_readable: true,
      },
    })) as { outcome: string };
    return json({ status: result.outcome, attempt: prepared.attempt });
  }

  const { data: signed, error } = await admin.storage.from('media').createSignedUrl(prepared.photo_path!, 60);
  if (error) throw error;
  const url = await hyperverge.startSession({
    transactionId,
    faceImageUrl: signed.signedUrl,
    redirectUrl: Deno.env.get('KYC_REDIRECT_URL') ?? 'yuvomeet://verify/result',
  });
  return json({ status: 'started', url, attempt: prepared.attempt });
});
