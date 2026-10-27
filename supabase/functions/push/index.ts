// Internal: Expo push fan-out, called by Postgres through pg_net with the internal secret.
// Payloads carry generic copy and ids only (S-48). Dead tokens are deleted.
import { requireSecret, safeEqual } from '../_shared/crypto.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { admin, unwrap } from '../_shared/supabase.ts';

interface PushRequest {
  user_ids: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (!safeEqual(req.headers.get('x-internal-secret') ?? '', requireSecret('INTERNAL_SECRET'))) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');
  }
  const { user_ids, title, body, data } = await readJson<PushRequest>(req);
  const tokens = unwrap(await admin.rpc('svc_push_tokens', { p_user_ids: user_ids })) as { token: string }[];
  if (tokens.length === 0) return json({ sent: 0 });

  const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}),
      },
      body: JSON.stringify(chunk.map(({ token }) => ({ to: token, title, body, data, sound: 'default' }))),
    });
    if (!res.ok) continue;
    const tickets = ((await res.json()) as { data?: { status: string; details?: { error?: string } }[] }).data ?? [];
    tickets.forEach((t, idx) => {
      if (t.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx].token);
    });
  }
  if (dead.length) await admin.rpc('svc_drop_push_tokens', { p_tokens: dead });
  return json({ sent: tokens.length - dead.length });
});
