// Pure document operations shared by the browser and regression tests.
export function filename(value) {
  const leaf = value.split(/[\\/]/).pop() || 'Untitled.md';
  const safe = leaf.replace(/[\u0000-\u001f<>:"|?*]/g, '-').trim();
  return /\.(md|markdown)$/i.test(safe) ? safe : `${safe || 'Untitled'}.md`;
}
export function title(content, name) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || name.replace(/\.(md|markdown)$/i, '') || 'Untitled';
}
export function updateDocument(doc, content) {
  return { ...doc, content, title: title(content, doc.filename), modified: Date.now() / 1000 };
}
export function changed(doc) { return doc.downloadedContent !== doc.content; }
export function restoreDocuments(value) {
  if (!Array.isArray(value)) throw new Error('Invalid browser draft');
  return value.filter(d => d && typeof d.id === 'string' && typeof d.content === 'string' && typeof d.filename === 'string')
    .map(d => ({ ...d, filename: filename(d.filename), title: title(d.content, d.filename) }));
}

export function renameDocument(doc, name) {
  const nextName = filename(name);
  return { ...doc, filename: nextName, path: nextName, title: title(doc.content, nextName) };
}
export function recordDownload(doc, content, name) {
  return { ...renameDocument(doc, name), downloadedContent: content };
}
