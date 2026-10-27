// ON-6: immediate effects (sessions revoked, profile hidden, joins withdrawn, hosted plans
// cancelled), purge scheduled within 30 days, analytics person deleted (privacy §3).
import { json, serve } from '../_shared/http.ts';
import { admin, requireUser, unwrap } from '../_shared/supabase.ts';

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

serve(async (req) => {
  const userId = await requireUser(req);
  const purgeAfter = unwrap(await admin.rpc('svc_request_deletion', { p_user: userId }));
  await deletePostHogPerson(userId);
  return json({ purge_after: purgeAfter });
});
