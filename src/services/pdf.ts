import type { Editor } from '@tiptap/react';
import { filename } from '../browser/documents.mjs';
export async function downloadPdf(editor: Editor, _title: string) {
  if (editor) window.print();
}
export async function downloadMarkdown(markdown: string, name: string): Promise<string | null> {
  const requested = window.prompt('Download Markdown as:', filename(name));
  if (requested === null) return null;
  const downloadName = filename(requested);
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = downloadName;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return downloadName;
}
