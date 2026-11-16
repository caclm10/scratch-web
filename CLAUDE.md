# Scratch Web development

This is a browser-only adaptation of erictli/scratch. Use `npm ci`, `npm test`, `npm run build`, and `npm run dev`. No Tauri or Rust build is needed.

`src/components/editor/` retains the shared TipTap editor. `src/browser/` contains browser platform operations, document validation, image policy, and IndexedDB recovery. `src/context/NotesContext.tsx` manages open/recovered documents with stable IDs. `src/services/pdf.ts` handles download and print. `src/App.tsx` provides the browser shell.

Preserve the open → edit → download model. Do not add direct folder access, upload document text, or restore AI integrations. Browser draft persistence must never be described as saving the original local file. Production builds generate the offline shell via `scripts/build-offline.mjs`.
