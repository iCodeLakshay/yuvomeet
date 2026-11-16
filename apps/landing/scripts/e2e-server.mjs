// Builds the static export, then serves it. Playwright starts this as its webServer.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const nextBin = createRequire(path.join(app, 'package.json')).resolve('next/dist/bin/next');
const build = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: app,
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_SITE_URL: 'https://hengout.app' },
});
if (build.status !== 0) process.exit(build.status ?? 1);

process.argv[2] = path.join(app, 'out');
process.argv[3] = process.env.E2E_PORT ?? '4310';
await import('./serve.mjs');
