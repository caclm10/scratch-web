import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOffline } from '../scripts/build-offline.mjs';
import vm from 'node:vm';
test('production offline worker caches app assets and ignores external requests and writes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'scratch-offline-'));
  try {
    await mkdir(join(dir, 'dist/assets'), { recursive: true });
    await writeFile(join(dir, 'dist/index.html'), '<html>app</html>');
    await writeFile(join(dir, 'dist/assets/editor.js'), 'console.log("app")');
    await buildOffline(join(dir, 'dist'));
    const handlers = {};
    let cacheUrls;
    const context = {
      URL, Response,
      self: { registration: { scope: 'https://example.test/scratch/' }, location: { origin: 'https://example.test' }, addEventListener: (type, handler) => { handlers[type] = handler; } },
      caches: { open: async () => ({ addAll: async urls => { cacheUrls = urls; }, match: async () => undefined }), keys: async () => [] },
      fetch: async () => new Response('network'),
    };
    vm.runInNewContext(await readFile(join(dir, 'dist/sw.js'), 'utf8'), context);
    let installed;
    handlers.install({ waitUntil: value => { installed = value; } });
    await installed;
    assert.deepEqual(Array.from(cacheUrls), ['https://example.test/scratch/assets/editor.js', 'https://example.test/scratch/index.html']);
    let intercepted = false;
    handlers.fetch({ request: { method: 'GET', url: 'https://images.example/photo.png' }, respondWith: () => { intercepted = true; } });
    handlers.fetch({ request: { method: 'POST', url: 'https://example.test/document' }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
