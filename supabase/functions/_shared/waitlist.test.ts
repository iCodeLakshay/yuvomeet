import { assertEquals } from 'jsr:@std/assert@1.0.13';
import { allowedOrigins, clientIp, corsHeaders, parseWaitlist } from './waitlist.ts';

Deno.test('parseWaitlist accepts a normal submission and normalises it', () => {
  const r = parseWaitlist({ email: '  Riya@Example.com ', city: ' Navi   Mumbai ', consent: true, website: '' });
  assertEquals(r, { ok: true, value: { email: 'riya@example.com', city: 'Navi Mumbai', consent: true, bot: false } });
});

Deno.test('parseWaitlist rejects bad input field by field', () => {
  assertEquals(parseWaitlist(null), { ok: false, field: 'body' });
  assertEquals(parseWaitlist([]), { ok: false, field: 'body' });
  assertEquals(parseWaitlist({ email: 'not-an-email', city: 'Kota', consent: true }), { ok: false, field: 'email' });
  assertEquals(parseWaitlist({ email: `${'a'.repeat(250)}@x.co`, city: 'Kota', consent: true }), { ok: false, field: 'email' });
  assertEquals(parseWaitlist({ email: 'a@b.co', city: 'K', consent: true }), { ok: false, field: 'city' });
  assertEquals(parseWaitlist({ email: 'a@b.co', city: '<script>', consent: true }), { ok: false, field: 'city' });
  assertEquals(parseWaitlist({ email: 'a@b.co', city: 'Kota', consent: 'yes' }), { ok: false, field: 'consent' });
  assertEquals(parseWaitlist({ email: 'a@b.co', city: 'Kota' }), { ok: false, field: 'consent' });
});

Deno.test('parseWaitlist flags the honeypot and ignores unknown fields', () => {
  const r = parseWaitlist({ email: 'a@b.co', city: 'Kota', consent: true, website: 'spam', id: 5, is_admin: true });
  assertEquals(r, { ok: true, value: { email: 'a@b.co', city: 'Kota', consent: true, bot: true } });
});

Deno.test('CORS allows only listed origins, never a wildcard', () => {
  const allowed = allowedOrigins('https://yuvomeet.app, https://www.yuvomeet.app/, *, not a url');
  assertEquals([...allowed], ['https://yuvomeet.app', 'https://www.yuvomeet.app']);
  assertEquals(corsHeaders('https://evil.example', allowed), null);
  assertEquals(corsHeaders(null, allowed), null);
  assertEquals(corsHeaders('https://yuvomeet.app', allowed)?.['Access-Control-Allow-Origin'], 'https://yuvomeet.app');
});

Deno.test('clientIp takes the first forwarded hop', () => {
  assertEquals(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
  assertEquals(clientIp(new Headers()), 'unknown');
});
