// Amazon Rekognition in ap-south-1 (integrations.md §Rekognition). Only image bytes are sent;
// no user id or metadata. Requests are SigV4-signed with aws4fetch to keep the bundle small.
import { AwsClient } from 'npm:aws4fetch@1.0.20';
import { encodeBase64 } from 'jsr:@std/encoding@1.0.10/base64';

// Categories that block or hold an image (top-level Rekognition taxonomy).
const BLOCKING = /explicit|nudity|sexual|violence|visually disturbing|hate symbols|drugs/i;

export interface ModerationOutput {
  labels: string[];
  topConfidence: number;
  faces: number;
}

export const isConfigured = () => Boolean(Deno.env.get('AWS_ACCESS_KEY_ID'));

const region = Deno.env.get('AWS_REGION') ?? 'ap-south-1';
let client: AwsClient | null = null;

async function rekognition<T>(action: string, image: Uint8Array): Promise<T> {
  client ??= new AwsClient({
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
    region,
    service: 'rekognition',
  });
  const body: Record<string, unknown> = { Image: { Bytes: encodeBase64(image) } };
  if (action === 'DetectModerationLabels') body.MinConfidence = 40;
  // Throttling is retried with backoff so bursts delay instead of failing (default 5 TPS).
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await client.fetch(`https://rekognition.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': `RekognitionService.${action}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return (await res.json()) as T;
    if (res.status !== 400 && res.status < 500) throw new Error(`Rekognition ${action} ${res.status}`);
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }
  throw new Error(`Rekognition ${action} failed after retries`);
}

export async function moderate(image: Uint8Array, needsFace: boolean): Promise<ModerationOutput> {
  const [moderation, faces] = await Promise.all([
    rekognition<{ ModerationLabels?: { Name: string; ParentName?: string; Confidence: number }[] }>(
      'DetectModerationLabels',
      image,
    ),
    needsFace ? rekognition<{ FaceDetails?: unknown[] }>('DetectFaces', image) : Promise.resolve({ FaceDetails: [{}] }),
  ]);
  const blocking = (moderation.ModerationLabels ?? []).filter((l) => BLOCKING.test(`${l.ParentName ?? ''} ${l.Name}`));
  return {
    labels: [...new Set(blocking.map((l) => l.ParentName || l.Name))],
    topConfidence: blocking.reduce((max, l) => Math.max(max, l.Confidence), 0),
    faces: faces.FaceDetails?.length ?? 0,
  };
}
