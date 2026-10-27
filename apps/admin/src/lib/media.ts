import type { Db } from './supabase';

/** Short-lived signed URLs (S-22) for media the admin session may read under storage RLS. */
export async function signMedia(db: Db, paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (!list.length) return new Map();
  const { data } = await db.storage.from('media').createSignedUrls(list, 300);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}
