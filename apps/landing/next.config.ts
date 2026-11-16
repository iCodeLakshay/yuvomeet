import type { NextConfig } from 'next';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// .npmrc keeps pnpm's virtual store outside the repo (`../.p`, a Windows path-length fix).
// Turbopack only compiles files under its root, so the root must contain both (as in apps/admin).
const repo = path.resolve(process.cwd(), '../..');
const nextDir = path.dirname(realpathSync(createRequire(path.join(process.cwd(), 'package.json')).resolve('next/package.json')));
const commonRoot = (a: string, b: string) => {
  const [x, y] = [a.split(path.sep), b.split(path.sep)];
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  return x.slice(0, i).join(path.sep) || path.sep;
};

// A static site: `next build` writes plain HTML, CSS and JS to `out/`, which any static host serves.
// The waitlist form posts straight to the join-waitlist Edge Function, so no server is needed.
const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  poweredByHeader: false,
  turbopack: { root: commonRoot(repo, nextDir) },
};

export default config;
