// Edge Function: check-in (Enforces PL-6, S-36, S-37)
// Verifies distance <= 150m, accuracy <= 100m, time within ±30m, mocked = false.
// Coordinates are checked in memory and NEVER stored or logged.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

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

  const { planId, lat, lng, accuracy, mocked } = await req.json();

  if (mocked === true) {
    return new Response(
      JSON.stringify({ error: 'MOCK_LOCATION_DETECTED', message: 'Disable mock location to check in.' }),
      { status: 400 },
    );
  }

  if (typeof accuracy !== 'number' || accuracy > 100) {
    return new Response(
      JSON.stringify({ error: 'LOW_GPS_ACCURACY', message: 'Move to an open area for better GPS signal.' }),
      { status: 400 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: plan } = await admin
    .from('plans')
    .select('id, starts_at, venue_id, venues!inner(lat, lng)')
    .eq('id', planId)
    .single();

  if (!plan) {
    return new Response(JSON.stringify({ error: 'PLAN_NOT_FOUND' }), { status: 404 });
  }

  const { data: member } = await admin
    .from('plan_members')
    .select('status, checked_in_at')
    .eq('plan_id', planId)
    .eq('user_id', user.id)
    .single();

  if (!member || (member.status !== 'approved' && member.status !== 'attended')) {
    return new Response(JSON.stringify({ error: 'NOT_APPROVED_MEMBER' }), { status: 403 });
  }

  const minutesFromStart = Math.round((Date.now() - new Date(plan.starts_at).getTime()) / 60000);
  if (Math.abs(minutesFromStart) > 30) {
    return new Response(
      JSON.stringify({
        error: 'OUTSIDE_TIME_WINDOW',
        minutesFromStart,
        message: 'Check-in opens 30 minutes before and closes 30 minutes after start time.',
      }),
      { status: 400 },
    );
  }

  const venue = Array.isArray(plan.venues) ? plan.venues[0] : plan.venues;
  const distanceMeters = haversineMeters(Number(lat), Number(lng), venue.lat, venue.lng);

  if (distanceMeters > 150) {
    return new Response(
      JSON.stringify({
        error: 'TOO_FAR_FROM_VENUE',
        distanceMeters,
        message: 'You must be within 150 meters of the venue to check in.',
      }),
      { status: 400 },
    );
  }

  const checkedInAt = new Date().toISOString();
  await admin
    .from('plan_members')
    .update({ checked_in_at: checkedInAt, updated_at: checkedInAt })
    .eq('plan_id', planId)
    .eq('user_id', user.id);

  return new Response(
    JSON.stringify({
      ok: true,
      checkedInAt,
      minutesFromStart,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
