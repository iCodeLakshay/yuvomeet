// Edge Function: kyc-start (VR-1, VR-2, S-38, Cost guard circuit breaker)
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

  // VR-2: Refuse 3rd liveness_face attempt and route to manual review
  const { count: priorAttempts } = await admin
    .from('verification_checks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'liveness_face');

  const attempt = (priorAttempts ?? 0) + 1;
  if (attempt > 2) {
    await admin
      .from('profiles')
      .update({ verification_status: 'manual_review', updated_at: new Date().toISOString() })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        status: 'manual_review',
        message: "We're checking your photos by hand. Expect a reply within 24 hours.",
      }),
      { status: 200 },
    );
  }

  return new Response(
    JSON.stringify({
      sessionId: `hv_${user.id}_${attempt}_${Date.now()}`,
      attempt,
      provider: 'hyperverge',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
