import { useQuery } from '@tanstack/react-query';
import { SIGNED_URL_TTL_SEC } from '@yuvomeet/shared';
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

/** Opens the camera or library; returns a resized JPEG (EXIF dropped by re-encoding). */
export async function pickImage(source: 'camera' | 'library', square = false): Promise<string | null> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new AppError(`Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to add a photo.`, 'PERMISSION');

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: square, aspect: [1, 1], quality: 1, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_EDGE) {
    context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  return saved.uri;
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

  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const bytes = await new File(localUri).arrayBuffer();
  unwrap(await supabase.storage.from('quarantine').upload(path, bytes, { contentType: 'image/jpeg' }));
  return callFunction<UploadResult>('moderate-image', { ...target, path });
}
