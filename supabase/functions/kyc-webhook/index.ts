// S-38, S-39, S-40, S-53: HyperVerge result callback. Only the transaction id is read from
// the body; the verdict is fetched from HyperVerge with our credentials, reduced to the
// fields we may store, and applied atomically by svc_kyc_apply. Nothing here is logged.
import type { Json } from '../../../packages/shared/src/database.types.ts';
import * as hyperverge from '../_shared/hyperverge.ts';
import { HttpError, json, serve } from '../_shared/http.ts';
import { admin, unwrap } from '../_shared/supabase.ts';

serve(async (req) => {
  if (!hyperverge.webhookAuthorized(req)) throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');

  const transactionId = hyperverge.webhookTransactionId(await req.json().catch(() => null));
  if (!transactionId) throw new HttpError(400, 'BAD_REQUEST', 'Missing transaction');

  // Replays are harmless (svc_kyc_apply ignores completed sessions) but are dropped early.
  const { error: replay } = await admin.rpc('svc_webhook_seen', {
    p_provider: 'hyperverge',
    p_event_id: transactionId,
  });
  if (replay) return json({ ok: true, duplicate: true });

  const result = await hyperverge.fetchResult(transactionId);
  const applied = unwrap(await admin.rpc('svc_kyc_apply', { p_result: result as unknown as Json }));
  return json({ ok: true, outcome: (applied as { outcome: string }).outcome });
});
