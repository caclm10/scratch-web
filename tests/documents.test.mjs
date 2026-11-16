import test from 'node:test';
import assert from 'node:assert/strict';
import { filename, title, updateDocument, changed, restoreDocuments, renameDocument, recordDownload } from '../src/browser/documents.mjs';
const source = '\ufeff---\ntitle: Private\n---\n\n# Catatan\n\n日本語 🙂\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nconst value = "<script>";\n```\n\n![photo](assets/photo.png)\n';
const original = { id: 'a', filename: 'meeting.md', content: source, downloadedContent: source, modified: 1 };
test('recovery preserves exact Markdown including Unicode, frontmatter, tables, code and image references', () => {
 const [doc] = restoreDocuments(JSON.parse(JSON.stringify([original])));
 assert.equal(doc.content, source); assert.equal(changed(doc), false);
});
test('editing a heading preserves identity, original filename and original download baseline', () => {
 const edited = updateDocument(original, '# Renamed\n\nNew text');
 assert.equal(edited.id, 'a'); assert.equal(edited.filename, 'meeting.md');
 assert.equal(edited.downloadedContent, source); assert.equal(edited.title, 'Renamed');
 assert.equal(changed(edited), true); assert.equal(original.content, source);
});
test('documents with identical filenames remain distinct during recovery', () => {
 const docs = restoreDocuments([original, { ...original, id: 'b', content: '# Another file' }]);
 assert.equal(docs.length, 2); assert.notEqual(docs[0].id, docs[1].id);
 assert.equal(docs[0].content, source);
});
test('download names cannot contain traversal paths or filesystem control characters', () => {
 assert.equal(filename('../../notes.md'), 'notes.md');
 assert.equal(filename('C:\\folder\\notes.markdown'), 'notes.markdown');
 assert.equal(filename(''), 'Untitled.md'); assert.equal(filename('draft\u0000?'), 'draft--.md');
});
test('malformed recovery records are rejected without treating their content as executable markup', () => {
 assert.throws(() => restoreDocuments({ content: source }));
 assert.deepEqual(restoreDocuments([null, {}, { id: 3, content: 'x' }]), []);
 const [doc] = restoreDocuments([{ ...original, content: '<script>alert(1)</script>' }]);
 assert.equal(doc.content, '<script>alert(1)</script>');
});
test('a downloaded snapshot does not mark subsequent edits as saved', () => {
 const downloaded = { ...original, downloadedContent: original.content };
 assert.equal(changed(downloaded), false);
 assert.equal(changed(updateDocument(downloaded, `${source}\nNew paragraph`)), true);
 assert.equal(title('', 'meeting.md'), 'meeting');
});

test('download filename survives recovery and later edits without changing the document identity', () => {
 const saved = recordDownload(original, source, 'Project notes');
 const [restored] = restoreDocuments(JSON.parse(JSON.stringify([saved])));
 const edited = updateDocument(restored, '# Revised heading');
 assert.equal(edited.filename, 'Project notes.md');
 assert.equal(edited.path, 'Project notes.md');
 assert.equal(edited.id, original.id);
 assert.equal(edited.downloadedContent, source);
});
test('renaming a draft changes its filename and preserves its content and heading', () => {
 const renamed = renameDocument(original, 'renamed.md');
 assert.equal(renamed.filename, 'renamed.md');
 assert.equal(renamed.title, 'Catatan');
 assert.equal(renamed.content, source);
 assert.equal(renamed.downloadedContent, source);
});
test('recording an older download preserves any newer edits', () => {
 const edited = updateDocument(original, '# Newer text');
 const saved = recordDownload(edited, source, 'notes.md');
 assert.equal(saved.content, '# Newer text');
 assert.equal(changed(saved), true);
});
