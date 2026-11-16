# Scratch Web

**Scratch Web is derived from [Scratch by Eric Li (`erictli/scratch`)](https://github.com/erictli/scratch), an offline-first desktop Markdown notes app.** This repository adapts the original application for the browser; credit for the original Scratch editor, interface, and application goes to Eric Li and the upstream contributors.

 It keeps Scratch's React/TipTap editor, Markdown source mode, tables, code highlighting, diagrams, math, and appearance controls. AI integrations, Git, Tauri, native filesystem access, native updater and CLI integration have been removed.

## Run

Requires Node.js 22+ and access to the npm registry for the initial installation.

```sh
npm ci
npm run dev
```

Open the address printed by Vite (normally http://127.0.0.1:5173).

```sh
npm test
npm run build
npm run preview
```

Deploy `dist/` to any static host. Use HTTPS in production; localhost also supports the browser APIs used here. No application server, account, database server, Rust, or WASM is needed.

## Files and drafts

- Open `.md` / `.markdown` files with **Open file** or drag and drop. Multiple documents can be opened, including files with identical names.
- Edits update the browser draft in IndexedDB. Drafts are restored automatically on the next visit. A recovery message distinguishes restored drafts from source files.
- **Download .md** (Ctrl/Command S) asks for a filename and starts a browser download. The original opened file is never overwritten. A download cannot prove the browser actually wrote the file to disk, so the interface reports the download starting rather than claiming filesystem success.
- Use the pencil button beside a document in the sidebar to rename it. The filename also updates when you choose a different name in the download dialog; it is retained in recovered drafts.
- Close a changed document to choose between download, keeping its browser draft, or discarding it. Keeping a draft leaves it available in the sidebar for reopening.
- Clearing site data removes recovery drafts. A download is the durable, user-managed copy. If IndexedDB is unavailable or full, a visible status and toast report the failure; editing and downloads remain available.
- Search covers the contents of documents in this browser session, including recovered drafts. There is no directory scan or filesystem watcher.

## Images and privacy

Documents are read with the browser File API and are not uploaded. Preferences stay in localStorage. There is no telemetry or AI integration.

Relative image links remain intact in Markdown. Under **Appearance**, select companion raster images to display matching filenames; their contents are held in memory for that session. New inserted/pasted images are embedded as data URLs so downloads can be self-contained (this increases file size). PNG, JPEG, GIF and WebP are supported; SVG is deliberately excluded from local insertion.

Remote images are blocked by the editor until explicitly enabled in Appearance for the current session. Once enabled, the image host receives ordinary image requests. External links only open when clicked.

## Offline

Production builds generate an app-shell service worker and a web app manifest. After a successful initial online load and cache installation, the editor's bundled assets can be opened offline. Documents are stored separately in IndexedDB and are never put in the service worker's network cache. Development mode does not install a service worker.

## Validation status in this workspace

Rechecked after dependencies were installed:

- `npm test` passes both test files: nine document-model cases and one offline-worker case.
- `npm run build` passes full TypeScript checking and the Vite production build. The offline app shell includes 68 assets.
- Vite reports a non-fatal bundle-size warning: the main JavaScript bundle is approximately 2.95 MB minified (906 KB gzip).
- Browser interaction tests remain unverified. Starting `npm run preview -- --host 127.0.0.1 --port 4173` is blocked by the execution environment with `listen EPERM`.
- Publication has not been performed. Run the preview command from a terminal that permits listening on localhost to manually check open/edit/download, recovery, image loading and offline behavior.

## Attribution

- **Original project:** [Scratch](https://github.com/erictli/scratch)
- **Original author:** [Eric Li](https://github.com/erictli) and the upstream contributors
- **Browser adaptation:** [caclm10/scratch-web](https://github.com/caclm10/scratch-web)

This is an independently maintained browser adaptation. The upstream README declares Scratch MIT licensed. Third-party packages retain their own licenses.
