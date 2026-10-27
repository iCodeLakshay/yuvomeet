// HyperVerge adapter (integrations.md §HyperVerge). All provider-specific shapes live here.
//
// Flow: kyc-start creates a link-KYC transaction and returns its URL; the app opens it in an
// in-app browser (DigiLocker or offline eKYC, then selfie). HyperVerge calls kyc-webhook.
// The webhook body is never trusted for the verdict (S-38): kyc-webhook only takes the
// transaction id from it and fetches results server-to-server with our credentials.
//
// Endpoint paths and result field names follow HyperVerge's link-KYC API and must be
// confirmed against the account's workflow configuration during sandbox onboarding.
import { hmacSha256Hex, requireSecret } from './crypto.ts';

const BASE_URL = Deno.env.get('HYPERVERGE_BASE_URL') ?? 'https://ind-engine.thomas.hyperverge.co/v1';

export interface KycResult {
  transaction_id: string;
  fingerprint: string | null;
  birth_year: number | null;
  gender: 'woman' | 'man' | 'other' | null;
  face_score: number;
  liveness_score: number;
  id_readable: boolean;
}

export const isConfigured = () => Boolean(Deno.env.get('HYPERVERGE_APP_ID'));

function headers() {
  return {
    'Content-Type': 'application/json',
    appId: requireSecret('HYPERVERGE_APP_ID'),
    appKey: requireSecret('HYPERVERGE_APP_KEY'),
  };
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HyperVerge ${path} ${res.status}`);
  return (await res.json()) as T;
}

/** Creates a link-KYC transaction. The face-match reference is a 60-second signed URL. */
export async function startSession(input: { transactionId: string; faceImageUrl: string; redirectUrl: string }) {
  const data = await call<{ result?: { startKycUrl?: string } }>('/link-kyc/start', {
    workflowId: requireSecret('HYPERVERGE_WORKFLOW_ID'),
    transactionId: input.transactionId,
    redirectUrl: input.redirectUrl,
    inputs: { faceMatchImageUrl: input.faceImageUrl },
  });
  const url = data.result?.startKycUrl;
  if (!url) throw new Error('HyperVerge start returned no URL');
  return url;
}

/** Rejects webhook calls that do not carry our shared secret (drops spam before any lookup). */
export function webhookAuthorized(req: Request): boolean {
  const expected = Deno.env.get('HYPERVERGE_WEBHOOK_SECRET');
  return Boolean(expected) && req.headers.get('x-webhook-secret') === expected;
}

export function webhookTransactionId(payload: unknown): string | null {
  const p = payload as { transactionId?: unknown; transaction_id?: unknown };
  const id = p?.transactionId ?? p?.transaction_id;
  return typeof id === 'string' && id.length <= 128 ? id : null;
}

type Module = { moduleId?: string; apiResponse?: { result?: Record<string, unknown>; details?: Record<string, unknown> } };

function pick(modules: Module[], keys: string[]): unknown {
  for (const m of modules) {
    const sources = [m.apiResponse?.result, m.apiResponse?.details];
    for (const src of sources) {
      if (!src) continue;
      for (const key of keys) if (src[key] !== undefined && src[key] !== null) return src[key];
    }
  }
  return null;
}

function toGender(value: unknown): KycResult['gender'] {
  const v = String(value ?? '').toLowerCase();
  if (v.startsWith('f') || v === 'woman') return 'woman';
  if (v.startsWith('m') || v === 'man') return 'man';
  return v ? 'other' : null;
}

function toScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

/**
 * Fetches results and reduces them to the fields we may store (S-39). The ID number, image,
 * name, address and full date of birth are dropped here and never logged.
 */
export async function fetchResult(transactionId: string): Promise<KycResult> {
  const data = await call<{ result?: { results?: Module[] } }>('/link-kyc/results', {
    transactionId,
    sendDebugInfo: 'no',
    sendReviewerDetails: 'no',
  });
  const modules = data.result?.results ?? [];
  const dob = String(pick(modules, ['dateOfBirth', 'dob', 'yob']) ?? '');
  const year = dob.match(/(19|20)\d{2}/)?.[0];
  const docRef = pick(modules, ['referenceId', 'idNumberHash', 'uidToken', 'idNumber']);

  return {
    transaction_id: transactionId,
    fingerprint: docRef ? await hmacSha256Hex(requireSecret('KYC_PEPPER'), String(docRef)) : null,
    birth_year: year ? Number(year) : null,
    gender: toGender(pick(modules, ['gender'])),
    face_score: toScore(pick(modules, ['matchScore', 'faceMatchScore', 'match'])),
    liveness_score: toScore(pick(modules, ['livenessScore', 'liveFace', 'liveness'])),
    id_readable: year !== undefined,
  };
}
