// Edge Function: delete-account & export-data (ON-6, S-12, Privacy §3-4)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();
  const purgeAfterIso = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  // Hide profile, withdraw pending joins, cancel future hosted plans, schedule 30-day purge
  await admin
    .from('profiles')
    .update({
      status: 'deleted',
      deleted_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', user.id);

  await admin
    .from('plan_members')
    .update({ status: 'withdrawn', updated_at: nowIso })
    .eq('user_id', user.id)
    .in('status', ['requested', 'approved']);

  await admin
    .from('plans')
    .update({
      status: 'cancelled',
      cancel_reason: 'Host account closed',
      cancelled_at: nowIso,
      updated_at: nowIso,
    })
    .eq('host_id', user.id)
    .in('status', ['open', 'full']);

  await admin
    .schema('private')
    .from('deletion_jobs')
    .upsert({
      user_id: user.id,
      requested_at: nowIso,
      purge_after: purgeAfterIso,
    });

  await admin.auth.admin.signOut(user.id, 'global');

  return new Response(
    JSON.stringify({
      ok: true,
      deletedAt: nowIso,
      purgeScheduledAt: purgeAfterIso,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
