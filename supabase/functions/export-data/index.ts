// ON-6, privacy §4: builds a JSON export in the private exports bucket and returns a
// short-lived signed link the app downloads and shares as a file.
import { json, serve } from '../_shared/http.ts';
import { admin, rateLimit, requireUser, unwrap } from '../_shared/supabase.ts';

serve(async (req) => {
  const userId = await requireUser(req);
  await rateLimit(userId, 'export-data', 86_400, 3);

  const bundle = unwrap(await admin.rpc('svc_export_user', { p_user: userId }));
  const path = `${userId}/yuvomeet-export-${Date.now()}.json`;
  const { error } = await admin.storage
    .from('exports')
    .upload(path, new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
  if (error) throw error;
  unwrap(await admin.rpc('svc_record_export', { p_user: userId, p_path: path }));

  const { data, error: signError } = await admin.storage.from('exports').createSignedUrl(path, 600);
  if (signError) throw signError;
  return json({ url: data.signedUrl, file_name: path.split('/')[1] });
});
