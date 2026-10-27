// Edge Function: export-data (ON-6, Privacy §4)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const [profileRes, consentsRes, membershipsRes, checksRes] = await Promise.all([
    userClient.from('profiles').select('*').eq('id', user.id).single(),
    userClient.from('consents').select('*').eq('user_id', user.id),
    userClient.from('plan_members').select('*').eq('user_id', user.id),
    userClient.from('verification_checks').select('type, verdict, decided_at').eq('user_id', user.id),
  ]);

  const exportBundle = {
    exportedAt: new Date().toISOString(),
    userId: user.id,
    profile: profileRes.data,
    consents: consentsRes.data ?? [],
    planMemberships: membershipsRes.data ?? [],
    verificationChecks: checksRes.data ?? [],
  };

  return new Response(JSON.stringify(exportBundle, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
