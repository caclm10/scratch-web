import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export async function buildOffline(root = 'dist') {
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(path);
    else if (entry.name !== 'sw.js') files.push(path.slice(root.length + 1));
  }
}
await walk(root);
const hash = createHash('sha256');
for (const path of files.sort()) hash.update(await readFile(`${root}/${path}`));
const version = hash.digest('hex').slice(0, 16);
await writeFile(`${root}/sw.js`, `
const PREFIX = 'scratch-web-' + self.registration.scope;
const CACHE = PREFIX + ${JSON.stringify(version)};
const URLS = ${JSON.stringify(files)}.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return (await cache.match(new URL('index.html', self.registration.scope).href)) || Response.error();
      throw error;
    }
  }));
});
`);
console.log(`Offline app shell generated (${files.length} assets).`);

}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await buildOffline();
