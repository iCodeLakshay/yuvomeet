import { useQuery } from '@tanstack/react-query';
import { ACCEPTED_IMAGE_LABEL, ACCEPTED_IMAGE_TYPES, MAX_PICK_BYTES, MAX_UPLOAD_BYTES, SIGNED_URL_TTL_SEC } from '@yuvomeet/shared';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { AppError, unwrap } from './errors';
import { callFunction } from './functions';
import { qk } from './query';
import { supabase } from './supabase';

type Bucket = 'media' | 'quarantine';

// Batches signed-URL requests made in the same frame into one createSignedUrls call.
const pending = new Map<Bucket, Map<string, ((url: string | null) => void)[]>>();
let scheduled = false;

function flush() {
  scheduled = false;
  for (const [bucket, waiters] of pending) {
    pending.delete(bucket);
    const paths = [...waiters.keys()];
    void supabase.storage
      .from(bucket)
      .createSignedUrls(paths, SIGNED_URL_TTL_SEC)
      .then(({ data }) => {
        const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
        for (const path of paths) for (const resolve of waiters.get(path) ?? []) resolve(byPath.get(path) ?? null);
      });
  }
}

function signedUrl(bucket: Bucket, path: string): Promise<string | null> {
  return new Promise((resolve) => {
    const waiters = pending.get(bucket) ?? new Map<string, ((url: string | null) => void)[]>();
    waiters.set(path, [...(waiters.get(path) ?? []), resolve]);
    pending.set(bucket, waiters);
    if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 0);
    }
  });
}

/** 60-second signed URL for a private object (S-22), refreshed before it expires. */
export function useSignedUrl(path: string | null | undefined, bucket: Bucket = 'media') {
  return useQuery({
    queryKey: qk.signedUrl(bucket, path ?? ''),
    queryFn: () => signedUrl(bucket, path!),
    enabled: Boolean(path),
    staleTime: (SIGNED_URL_TTL_SEC - 10) * 1000,
    gcTime: SIGNED_URL_TTL_SEC * 1000,
  }).data;
}

const MAX_EDGE = 1600;

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
};
const accepted = new Set<string>(ACCEPTED_IMAGE_TYPES);

/** The type the picker reports, falling back to the file extension when it reports none. */
function declaredType(asset: ImagePicker.ImagePickerAsset): string | null {
  const mime = asset.mimeType?.toLowerCase();
  if (mime) return mime === 'image/jpg' ? 'image/jpeg' : mime;
  const ext = (asset.fileName ?? asset.uri).split('?')[0]!.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TYPES[ext] ?? null;
}

const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

/**
 * Opens the camera or library and returns a resized JPEG (EXIF dropped by re-encoding).
 * Accepts JPEG, PNG, WebP, GIF (first frame), AVIF and HEIC; anything the device cannot decode
 * is reported as unreadable rather than uploaded.
 */
export async function pickImage(source: 'camera' | 'library', crop = false, aspect: [number, number] = [1, 1]): Promise<string | null> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new AppError(`Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to add a photo.`, 'PERMISSION');

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: crop, aspect, quality: 1, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;

  const type = declaredType(asset);
  if (type && !accepted.has(type)) {
    throw new AppError(`That file type isn't supported. Use ${ACCEPTED_IMAGE_LABEL}.`, 'UNSUPPORTED_FORMAT');
  }
  if (asset.fileSize && asset.fileSize > MAX_PICK_BYTES) {
    throw new AppError(`That photo is too large (${mb(asset.fileSize)} MB). Pick one under ${mb(MAX_PICK_BYTES)} MB.`, 'TOO_LARGE');
  }

  let uri: string;
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > MAX_EDGE) {
      context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }
    const image = await context.renderAsync();
    uri = (await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 })).uri;
  } catch {
    // Decoding is the real content check: a renamed or corrupt file, or an AVIF/HEIC this
    // device cannot decode, fails here instead of reaching storage.
    throw new AppError(`Couldn't read that image. Try a ${ACCEPTED_IMAGE_LABEL} photo.`, 'UNREADABLE');
  }
  return uri;
}

export interface UploadResult {
  id: string;
  status: 'approved' | 'pending' | 'rejected';
  path: string;
}

/** Uploads to the private quarantine bucket, then asks moderate-image to screen it (S-21). */
export async function uploadForModeration(
  localUri: string,
  target: { kind: 'profile'; position: number } | { kind: 'chat'; conversationId: string; messageId: string } | { kind: 'plan' },
): Promise<UploadResult> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new AppError('Sign in again.', 'UNAUTHORIZED');

  const bytes = await new File(localUri).arrayBuffer();
  // Content check, not extension: only a real JPEG within the size limit goes to storage.
  if (!isJpeg(new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength)))) {
    throw new AppError(`Couldn't read that image. Try a ${ACCEPTED_IMAGE_LABEL} photo.`, 'UNREADABLE');
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError(`That photo is still too large after resizing (${mb(bytes.byteLength)} MB; the limit is ${mb(MAX_UPLOAD_BYTES)} MB). Pick a smaller one.`, 'TOO_LARGE');
  }

  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('quarantine').upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw new AppError("The photo didn't upload. Check your connection and try again.", 'UPLOAD_FAILED');
  return callFunction<UploadResult>('moderate-image', { ...target, path });
}
