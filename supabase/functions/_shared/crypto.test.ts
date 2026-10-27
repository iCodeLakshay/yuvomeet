import { assertEquals } from 'jsr:@std/assert@1.0.13';
import { hmacSha256Hex, safeEqual } from './crypto.ts';

Deno.test('HMAC-SHA256 matches the RFC 4231 test vector', async () => {
  assertEquals(
    await hmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog'),
    'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
  );
});

Deno.test('safeEqual compares exactly', () => {
  assertEquals(safeEqual('abc', 'abc'), true);
  assertEquals(safeEqual('abc', 'abd'), false);
  assertEquals(safeEqual('abc', 'ab'), false);
});
