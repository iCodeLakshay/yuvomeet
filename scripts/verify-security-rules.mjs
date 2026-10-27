/**
 * S-2 secret scan, run in CI next to the pgTAP suite (supabase/tests), which covers the
 * database rules (S-1 RLS, S-5 no phone columns, S-46 audit_log, grants).
 *
 * 1. Client code (apps/mobile, apps/admin) never names a server-only secret.
 * 2. Nothing in the repo looks like a live credential (API keys, private keys).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP = new Set(['node_modules', '.git', '.expo', '.next', 'dist', 'build', 'android', 'ios']);
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|toml|sql|md|ya?ml|env|example)$/;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (TEXT.test(entry.name) || entry.name.startsWith('.env')) out.push(full);
  }
  return out;
}

const SERVER_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SERVICE_ROLE',
  'MSG91_AUTH_KEY',
  'HYPERVERGE_APP_KEY',
  'HYPERVERGE_WEBHOOK_SECRET',
  'AWS_SECRET_ACCESS_KEY',
  'INTERNAL_SECRET',
  'SEND_SMS_HOOK_SECRET',
  'OTP_HMAC_KEY',
  'POSTHOG_PERSONAL_API_KEY',
  'RAZORPAY_KEY_SECRET',
];

const CREDENTIAL_PATTERNS = [
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/AQ\.Ab[0-9A-Za-z_-]{30,}/, 'Google API key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/sk_live_[0-9a-zA-Z]{20,}/, 'live secret key'],
  [/eyJhbGciOi[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_-]*/, 'service_role JWT'],
];

const failures = [];
const clientFiles = ['apps/mobile/app', 'apps/mobile/src', 'apps/mobile/app.config.ts', 'apps/admin/src']
  .map((p) => path.join(ROOT, p))
  .filter((p) => fs.existsSync(p))
  .flatMap((p) => (fs.statSync(p).isDirectory() ? walk(p) : [p]));

for (const file of clientFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const name of SERVER_SECRETS) {
    if (content.includes(name)) failures.push(`S-2: ${path.relative(ROOT, file)} references server secret ${name}`);
  }
}

const allFiles = walk(ROOT);
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const [pattern, label] of CREDENTIAL_PATTERNS) {
    if (pattern.test(content)) failures.push(`S-2: ${path.relative(ROOT, file)} contains what looks like a ${label}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`✓ S-2: ${clientFiles.length} client files name no server secret; ${allFiles.length} files contain no credentials.`);
