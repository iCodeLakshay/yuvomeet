import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCsp } from '../csp.ts';
import { bad, firstInvalid, MAX_REASON, oneOf, reason, uuid } from '../validate.ts';

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe('action input validation', () => {
  it('accepts a uuid and rejects everything else', () => {
    assert.equal(uuid(form({ id: '8c1f6b52-2f0e-4d8e-9b8a-0c4f4e8d2a11' }), 'id'), '8c1f6b52-2f0e-4d8e-9b8a-0c4f4e8d2a11');
    for (const v of ['', 'abc', "1' or '1'='1", '8c1f6b52-2f0e-4d8e-9b8a-0c4f4e8d2a1', '8c1f6b52-2f0e-4d8e-9b8a-0c4f4e8d2a11 x']) {
      assert.ok(bad(uuid(form({ id: v }), 'id')), `rejects ${JSON.stringify(v)}`);
    }
    assert.ok(bad(uuid(form({}), 'id')), 'a missing field is rejected');
  });

  it('allows only listed values', () => {
    const allowed = ['active', 'suspended', 'banned'] as const;
    assert.equal(oneOf(form({ decision: 'banned' }), 'decision', allowed), 'banned');
    assert.ok(bad(oneOf(form({ decision: 'deleted' }), 'decision', allowed)));
    assert.ok(bad(oneOf(form({ decision: '' }), 'decision', allowed)));
    assert.ok(bad(oneOf(form({}), 'decision', allowed)));
  });

  it('requires a bounded reason', () => {
    assert.equal(reason(form({ reason: '  repeated reports  ' })), 'repeated reports');
    assert.ok(bad(reason(form({ reason: '   ' }))));
    assert.ok(bad(reason(form({ reason: 'x'.repeat(MAX_REASON + 1) }))));
    assert.equal(reason(form({ reason: 'x'.repeat(MAX_REASON) })), 'x'.repeat(MAX_REASON));
  });

  it('reports the first problem across several fields', () => {
    assert.equal(firstInvalid('ok', 5, { notAnError: true }), null);
    const err = firstInvalid('ok', { error: 'first' }, { error: 'second' });
    assert.deepEqual(err, { error: 'first' });
  });
});

describe('content security policy', () => {
  const directives = (csp: string) => Object.fromEntries(csp.split('; ').map((d) => [d.split(' ')[0], d.split(' ').slice(1)]));

  it('forbids framing, plugins and foreign form posts', () => {
    const d = directives(buildCsp('https://abc.supabase.co'));
    assert.deepEqual(d['frame-ancestors'], ["'none'"]);
    assert.deepEqual(d['object-src'], ["'none'"]);
    assert.deepEqual(d['form-action'], ["'self'"]);
    assert.deepEqual(d['base-uri'], ["'self'"]);
    assert.deepEqual(d['default-src'], ["'self'"]);
  });

  it('lets the page reach only itself, Supabase and Sentry', () => {
    const d = directives(buildCsp('https://abc.supabase.co/'));
    assert.ok(d['connect-src']?.includes('https://abc.supabase.co'));
    assert.ok(d['connect-src']?.includes('https://*.ingest.sentry.io'));
    assert.ok(d['img-src']?.includes('https://abc.supabase.co'));
    assert.ok(!Object.values(d).flat().includes('*'), 'no bare wildcard source');
  });

  it('keeps every directive intact (no mangled sources)', () => {
    const csp = buildCsp('http://127.0.0.1:54321');
    assert.match(csp, /connect-src 'self' http:\/\/127\.0\.0\.1:54321 https:\/\/\*\.ingest\.sentry\.io/);
    assert.ok(!/ {2,}/.test(csp), 'no doubled spaces');
  });

  it('still produces a valid policy when the Supabase URL is missing', () => {
    const d = directives(buildCsp(undefined));
    assert.deepEqual(d['img-src'], ["'self'", 'data:', 'blob:']);
    assert.ok(d['connect-src']?.includes("'self'"));
  });
});
