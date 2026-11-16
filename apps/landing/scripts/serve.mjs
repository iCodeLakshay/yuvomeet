// Serves the static export the way a static host would: gzip, long cache for hashed assets,
// directory index.html (trailingSlash), and 404.html with a 404 status. Used by the e2e tests and
// for local Lighthouse runs:  node scripts/serve.mjs out 4310
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'out');
const port = Number(process.argv[3] ?? 4310);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain',
  '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

async function resolve(url) {
  const file = path.join(root, decodeURIComponent(url.split('?')[0]));
  if (!file.startsWith(root)) return null; // no path traversal
  try {
    const s = await stat(file);
    const target = s.isDirectory() ? path.join(file, 'index.html') : file;
    await stat(target);
    return target;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  let file = await resolve(req.url ?? '/');
  let status = 200;
  if (!file) {
    file = path.join(root, '404.html');
    status = 404;
  }
  let body = await readFile(file);
  const ext = path.extname(file);
  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': req.url?.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
  };
  if (/\.(html|js|css|svg|txt|xml|json|webmanifest)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
    body = gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
  }
  res.writeHead(status, headers).end(body);
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
