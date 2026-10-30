// S-21 to S-24: moderates an upload from the private quarantine bucket. EXIF is stripped,
// the SHA-256 cache prevents paying twice, and any provider failure is held for review
// (never approved). The image is stored in `media`; RLS shows it only once approved.
import { sha256Hex } from '../_shared/crypto.ts';
import { HttpError, isLocal, json, readJson, serve } from '../_shared/http.ts';
import { stripJpegMetadata } from '../_shared/jpeg.ts';
import * as rekognition from '../_shared/rekognition.ts';
import { admin, rateLimit, requireUser, unwrap } from '../_shared/supabase.ts';

const MAX_BYTES = 8 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface Body {
  kind?: 'profile' | 'chat' | 'plan';
  path?: string;
  position?: number;
  conversationId?: string;
  messageId?: string;
}

/** Names the real format from the first bytes, so the error says what was sent (never trusts the name). */
function sniffFormat(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'PNG';
  if (ascii(0, 3) === 'GIF') return 'GIF';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'WebP';
  if (ascii(4, 8) === 'ftyp') return /^(avif|avis)/.test(ascii(8, 12)) ? 'AVIF' : /^(heic|heix|mif1|msf1)/.test(ascii(8, 12)) ? 'HEIC' : null;
  return null;
}

serve(async (req) => {
  const userId = await requireUser(req);
  await rateLimit(userId, 'moderate-image', 3_600, 40);
  const body = await readJson<Body>(req);
  const path = body.path ?? '';
  if (!['profile', 'chat', 'plan'].includes(body.kind ?? '')) {
    throw new HttpError(400, 'BAD_REQUEST', 'This kind of upload is not supported. Update the app and try again.');
  }
  if (!new RegExp(`^${userId}/[0-9a-f-]{36}\\.jpg$`).test(path)) {
    throw new HttpError(400, 'BAD_REQUEST', 'The upload could not be matched to your account. Try again.');
  }
  if (body.kind === 'chat' && !(UUID.test(body.conversationId ?? '') && UUID.test(body.messageId ?? ''))) {
    throw new HttpError(400, 'BAD_REQUEST', 'The upload is missing its chat. Try again.');
  }

  const { data: file, error: downloadError } = await admin.storage.from('quarantine').download(path);
  if (downloadError || !file) throw new HttpError(400, 'UPLOAD_MISSING', "We couldn't find the uploaded photo. Try again.");
  if (file.size > MAX_BYTES) throw new HttpError(400, 'TOO_LARGE', 'That photo is larger than 8 MB. Pick a smaller one.');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const other = sniffFormat(bytes);
  if (other) {
    // The app converts every format to JPEG on the device; this only fires for a modified or old client.
    throw new HttpError(400, 'UNSUPPORTED_FORMAT', `A ${other} file reached the server unconverted. Update the app and try again.`);
  }
  let image: Uint8Array<ArrayBuffer>;
  try {
    image = stripJpegMetadata(bytes);
  } catch {
    throw new HttpError(400, 'BAD_UPLOAD', "That file isn't a valid image. Try a JPEG, PNG, WebP, GIF or AVIF photo.");
  }
  const id = unwrap(await admin.rpc('svc_register_upload', {
    p_user: userId,
    p_kind: body.kind!,
    p_quarantine_path: path,
    p_position: body.position ?? 0,
    p_conversation_id: body.conversationId,
    p_message_id: body.messageId,
  })) as string;

  const sha256 = await sha256Hex(image);
  const mediaPath =
    body.kind === 'profile'
      ? `profiles/${userId}/${id}.jpg`
      : body.kind === 'plan'
        ? `plans/${userId}/${id}.jpg`
        : `chat/${body.conversationId}/${id}.jpg`;

  let labels: string[] = [];
  let topConfidence = 0;
  let faces = 0;
  let providerError = false;
  const cached = unwrap(await admin.rpc('svc_media_cached', { p_sha256: sha256 }));
  if (!cached) {
    if (rekognition.isConfigured()) {
      try {
        ({ labels, topConfidence, faces } = await rekognition.moderate(image, body.kind === 'profile'));
        await admin.rpc('svc_vendor_usage', { p_vendor: 'rekognition', p_units: body.kind === 'profile' ? 2 : 1 });
      } catch {
        providerError = true;
      }
    } else if (isLocal() && Deno.env.get('MODERATION_STUB') === 'approve') {
      faces = 1;
    } else {
      providerError = true;
    }
  }

  const { error: uploadError } = await admin.storage.from('media').upload(mediaPath, image, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw uploadError;
  await admin.storage.from('quarantine').remove([path]);

  const status = unwrap(await admin.rpc('svc_apply_media', {
    p_kind: body.kind!,
    p_id: id,
    p_sha256: sha256,
    p_media_path: mediaPath,
    p_labels: labels,
    p_top_confidence: topConfidence,
    p_faces: faces,
    p_provider_error: providerError,
  }));
  return json({ id, status, path: mediaPath });
});
