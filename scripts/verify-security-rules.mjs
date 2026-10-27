/**
 * CI Security & Architecture Verification Script (docs/implementation-plan.md Slice 0 & docs/security.md)
 * Verifies:
 * 1. S-1: Every `public.*` table in migrations has `enable row level security`
 * 2. S-2: `apps/mobile` never references `service_role` or server-only vendor secret keys
 * 3. S-5: No `public` table has a column matching `phone|mobile|msisdn`
 * 4. S-46: `audit_log` has immutability trigger (`trg_audit_log_immutable`)
 * 5. Route Inventory completeness across `apps/mobile/app`
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const migrationPath = path.join(
  ROOT,
  'supabase',
  'migrations',
  '20261026000001_initial_schema.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

// 1. S-1: Every `create table public.<name>` has `alter table public.<name> enable row level security;`
const createdPublicTables = [...sql.matchAll(/create\s+table\s+public\.([a-z0-9_]+)\s*\(/gi)].map(
  (m) => m[1],
);
assert.ok(createdPublicTables.length >= 20, 'Expected at least 20 public tables in schema');

for (const table of createdPublicTables) {
  const rlsRegex = new RegExp(
    `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
    'i',
  );
  assert.ok(rlsRegex.test(sql), `S-1 Violation: public.${table} is missing ENABLE ROW LEVEL SECURITY`);
}
console.log(`✓ S-1 Passed: All ${createdPublicTables.length} public tables have RLS enabled.`);

// 2. S-5: No `create table public.<name>` block defines a `phone`, `mobile`, or `msisdn` column
const publicTableBlocks = [...sql.matchAll(/create\s+table\s+public\.([a-z0-9_]+)\s*\(([\s\S]*?)\);/gi)];
for (const [, tableName, body] of publicTableBlocks) {
  const lines = body
    .split('\n')
    .map((l) => l.replace(/--.*$/, '').trim())
    .filter(Boolean);
  for (const line of lines) {
    const colName = line.split(/\s+/)[0]?.toLowerCase() ?? '';
    assert.ok(
      !/^(phone|mobile|msisdn)/.test(colName),
      `S-5 Violation: public.${tableName} defines forbidden column ${colName}`,
    );
  }
}
console.log('✓ S-5 Passed: Zero phone/mobile/msisdn columns exist in public schema.');

// 3. S-46: audit_log immutability trigger
assert.ok(
  /create\s+trigger\s+trg_audit_log_immutable/i.test(sql) &&
    /revoke\s+update,\s*delete\s+on\s+public\.audit_log/i.test(sql),
  'S-46 Violation: audit_log must be insert-only with immutability trigger',
);
console.log('✓ S-46 Passed: audit_log is insert-only and protected by trigger.');

// 4. S-2: Secret grep on apps/mobile/src and apps/mobile/app
function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (/\.(ts|tsx|js|json)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const mobileFiles = [
  ...walkFiles(path.join(ROOT, 'apps', 'mobile', 'app')),
  ...walkFiles(path.join(ROOT, 'apps', 'mobile', 'src')),
];

const FORBIDDEN_MOBILE_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'MSG91_AUTH_KEY',
  'HYPERVERGE_APP_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'RAZORPAY_KEY_SECRET',
];

for (const file of mobileFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const secretName of FORBIDDEN_MOBILE_SECRETS) {
    assert.ok(
      !content.includes(secretName),
      `S-2 Violation: Mobile file ${path.relative(ROOT, file)} references server secret ${secretName}`,
    );
  }
}
console.log(`✓ S-2 Passed: Scanned ${mobileFiles.length} mobile source files — zero server secrets present.`);

// 5. Route inventory verification (docs/README.md)
const requiredRoutes = [
  'app/(entry)/splash.tsx',
  'app/(entry)/city.tsx',
  'app/(entry)/city-waitlist.tsx',
  'app/(entry)/phone.tsx',
  'app/(entry)/otp.tsx',
  'app/(entry)/consent.tsx',
  'app/(entry)/rules.tsx',
  'app/(profile)/create.tsx',
  'app/(profile)/photos.tsx',
  'app/(profile)/interests.tsx',
  'app/(profile)/edit.tsx',
  'app/user/[id].tsx',
  'app/(verify)/intro.tsx',
  'app/(verify)/id-check.tsx',
  'app/(verify)/selfie.tsx',
  'app/(verify)/result.tsx',
  'app/(verify)/appeal.tsx',
  'app/(tabs)/feed.tsx',
  'app/plan/[id].tsx',
  'app/plan/create.tsx',
  'app/(tabs)/my-plans.tsx',
  'app/plan/[id]/requests.tsx',
  'app/plan/[id]/check-in.tsx',
  'app/plan/[id]/rate.tsx',
  'app/(tabs)/chats.tsx',
  'app/chat/[conversationId].tsx',
  'app/chat/[conversationId]/members.tsx',
  'app/report.tsx',
  'app/safety/trusted-contact.tsx',
  'app/safety/sos.tsx',
  'app/venues/index.tsx',
  'app/venue/[id].tsx',
  'app/(tabs)/account.tsx',
  'app/settings/index.tsx',
  'app/settings/blocked.tsx',
  'app/settings/privacy.tsx',
  'app/settings/delete.tsx',
  'app/settings/appeals.tsx',
  'app/help.tsx',
  'app/suspended.tsx',
];

for (const relRoute of requiredRoutes) {
  const fullPath = path.join(ROOT, 'apps', 'mobile', relRoute);
  assert.ok(fs.existsSync(fullPath), `Missing required route file: ${relRoute}`);
}
console.log(`✓ Route Inventory Passed: All ${requiredRoutes.length} P0 mobile routes verified.`);
