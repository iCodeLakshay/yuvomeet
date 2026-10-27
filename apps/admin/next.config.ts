import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// .npmrc keeps pnpm's virtual store outside the repo (`../.p`, a Windows path-length fix).
// Turbopack only compiles files under its root, so the root must contain both.
const repo = path.resolve(process.cwd(), '../..');
const nextDir = path.dirname(realpathSync(createRequire(path.join(process.cwd(), 'package.json')).resolve('next/package.json')));
const commonRoot = (a: string, b: string) => {
  const [x, y] = [a.split(path.sep), b.split(path.sep)];
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  return x.slice(0, i).join(path.sep) || path.sep;
};

const config: NextConfig = {
  transpilePackages: ['@yuvomeet/shared'],
  poweredByHeader: false,
  turbopack: { root: commonRoot(repo, nextDir) },
  // Admin pages are never framed or cached by shared proxies.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withSentryConfig(config, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
