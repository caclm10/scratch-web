import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { WebDocument } from '../browser/storage';
import { loadDrafts, storeDrafts } from '../browser/storage';
import { filename, title, updateDocument, renameDocument, recordDownload } from '../browser/documents.mjs';
import { getSettings, updateSettings } from '../services/notes';

function useDocuments() {
  const [documents, setDocuments] = useState<WebDocument[]>([]);
  const docsRef = useRef(documents);
  const [selectedNoteId, setSelected] = useState<string | null>(null);
  const selectedRef = useRef(selectedNoteId); selectedRef.current = selectedNoteId;
  const [isLoading, setLoading] = useState(true);
  const [recovered, setRecovered] = useState(false);
  const [storageStatus, setStorageStatus] = useState('Loading drafts…');
  const pendingNew = useRef<string | null>(null);
  const queue = useRef(Promise.resolve());
  const persist = useCallback((docs: WebDocument[]) => {
    docsRef.current = docs; setDocuments(docs); setStorageStatus('Saving draft…');
    const task = queue.current.catch(() => {}).then(() => storeDrafts(docs));
    queue.current = task;
    void task.then(() => { if (docsRef.current === docs) setStorageStatus('Draft saved'); }, () => {
      setStorageStatus('Draft storage unavailable — download to keep changes');
      toast.error('Could not save draft. Download to keep your changes.', { id: 'storage-error' });
    });
    return task;
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadDrafts().then(docs => {
      if (cancelled) return;
      docsRef.current = docs; setDocuments(docs); setSelected(docs[0]?.id ?? null); setRecovered(docs.length > 0);
      setStorageStatus('Draft saved');
    }).catch(() => { if (!cancelled) setStorageStatus('Draft storage unavailable — download to keep changes'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const saveNote = useCallback(async (content: string, id?: string) => {
    const target = id ?? selectedRef.current;
    if (!target || !docsRef.current.some(d => d.id === target)) return;
    await persist(docsRef.current.map(d => d.id === target ? updateDocument(d, content) : d));
  }, [persist]);
  const createNote = useCallback(async () => {
    const id = crypto.randomUUID(); const name = 'Untitled.md';
    const doc: WebDocument = { id, filename: name, path: name, title: 'Untitled', content: '', modified: Date.now()/1000, downloadedContent: null };
    pendingNew.current = id; void persist([...docsRef.current, doc]); setSelected(id);
  }, [persist]);
  const importFiles = useCallback(async (files: File[]) => {
    const imported: WebDocument[] = [];
    for (const file of files) {
      if (!/\.(md|markdown)$/i.test(file.name)) { toast.error(`Not a Markdown file: ${file.name}`); continue; }
      try {
        const content = await file.text(); const name = filename(file.name);
        imported.push({ id: crypto.randomUUID(), filename: name, path: name, title: title(content, name), content, modified: Date.now()/1000, downloadedContent: content });
      } catch { toast.error(`Could not read ${file.name}`); }
    }
    if (imported.length) { void persist([...docsRef.current, ...imported]); setSelected(imported[0].id); }
  }, [persist]);
  const closeNote = useCallback((id: string, keepDraft: boolean) => {
    if (!keepDraft) void persist(docsRef.current.filter(d => d.id !== id));
    if (selectedRef.current === id) setSelected(docsRef.current.find(d => d.id !== id)?.id ?? null);
  }, [persist]);
  const markDownloaded = useCallback((id: string, content: string, name: string) => {
    window.dispatchEvent(new CustomEvent("document-downloaded", { detail: id }));
    void persist(docsRef.current.map(d => d.id === id ? recordDownload(d, content, name) : d));
  }, [persist]);
  const renameNote = useCallback((id: string, name: string) => {
    void persist(docsRef.current.map(d => d.id === id ? renameDocument(d, name) : d));
  }, [persist]);
  const pinNote = useCallback(async (id: string) => {
    const settings = await getSettings(); await updateSettings({ ...settings, pinnedNoteIds: [...new Set([...(settings.pinnedNoteIds ?? []), id])] });
  }, []);
  const unpinNote = useCallback(async (id: string) => {
    const settings = await getSettings(); await updateSettings({ ...settings, pinnedNoteIds: settings.pinnedNoteIds?.filter(x => x !== id) });
  }, []);
  return {
    documents, notes: documents.map(d => ({ ...d, preview: d.content.slice(0, 180) })),
    selectedNoteId, currentNote: documents.find(d => d.id === selectedNoteId) ?? null,
    isLoading, recovered, dismissRecovered: () => setRecovered(false), storageStatus,
    selectNote: async (id: string) => { setSelected(id); }, saveNote, createNote, importFiles, closeNote, markDownloaded, renameNote,
    consumePendingNewNote: (id: string) => { const match = pendingNew.current === id; pendingNew.current = null; return match; },
    hasExternalChanges: false, reloadVersion: 0, reloadCurrentNote: async () => {}, pinNote, unpinNote,
  };
}
type Context = ReturnType<typeof useDocuments>;
const NotesContext = createContext<Context | null>(null);
export function NotesProvider({ children }: { children: ReactNode }) { const value = useDocuments(); return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>; }
export function useOptionalNotes() { return useContext(NotesContext); }
export function useNotes() { const value = useOptionalNotes(); if (!value) throw new Error('Missing document provider'); return value; }
