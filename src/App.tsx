import { useEffect, useRef, useState } from 'react';
import { NotesProvider, useNotes } from './context/NotesContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Editor } from './components/editor/Editor';
import { AppearanceSettingsSection } from './components/settings/EditorSettingsSection';
import { TooltipProvider, Toaster } from './components/ui';
import { changed } from './browser/documents.mjs';
import { downloadMarkdown } from './services/pdf';
import { addImages, allowRemoteImages } from './browser/images';
import './browser/web.css';

type Panel = 'settings' | 'commands' | 'shortcuts' | null;
function Workspace() {
  const ctx = useNotes();
  const { cycleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [sidebar, setSidebar] = useState(true);
  const [focus, setFocus] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [remote, setRemote] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const dirty = useRef(new Set<string>());
  const previous = useRef(new Map<string, string>());
  useEffect(() => {
    for (const doc of ctx.documents) {
      if (previous.current.get(doc.id) !== doc.content && !changed(doc)) dirty.current.delete(doc.id);
      previous.current.set(doc.id, doc.content);
    }
    for (const id of dirty.current) if (!ctx.documents.some(d => d.id === id)) dirty.current.delete(id);
  }, [ctx.documents]);
  const download = () => window.dispatchEvent(new Event('download-note'));
  const source = () => window.dispatchEvent(new Event('toggle-source-mode'));
  const commands = [
    { label: 'New note', shortcut: 'Ctrl/⌘ N', run: () => void ctx.createNote() },
    { label: 'Open Markdown…', shortcut: 'Ctrl/⌘ O', run: () => fileInput.current?.click() },
    { label: 'Download Markdown…', shortcut: 'Ctrl/⌘ S', run: download },
    { label: 'Toggle Markdown source', shortcut: 'Ctrl/⌘ Shift M', run: source },
    { label: 'Toggle focus mode', shortcut: 'Ctrl/⌘ Shift Enter', run: () => setFocus(x => !x) },
    { label: 'Appearance settings', shortcut: 'Ctrl/⌘ ,', run: () => setPanel('settings') },
    { label: 'Keyboard shortcuts', shortcut: '', run: () => setPanel('shortcuts') },
  ];
  useEffect(() => {
    const onDirty = (event: Event) => dirty.current.add((event as CustomEvent<string>).detail);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current.size || ctx.documents.some(changed)) { event.preventDefault(); event.returnValue = ''; }
    };
    const downloaded = (event: Event) => dirty.current.delete((event as CustomEvent<string>).detail);
    window.addEventListener('document-dirty', onDirty);
    window.addEventListener('document-downloaded', downloaded);
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('document-dirty', onDirty); window.removeEventListener('document-downloaded', downloaded); window.removeEventListener('beforeunload', beforeUnload); };
  }, [ctx.documents]);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPanel(null); setFocus(false); return; }
      if (panel || closing) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'o') { e.preventDefault(); fileInput.current?.click(); }
      else if (key === 's') { e.preventDefault(); download(); }
      else if (key === 'n') { e.preventDefault(); void ctx.createNote(); }
      else if (key === 'p' && !e.shiftKey) { e.preventDefault(); setPanel('commands'); }
      else if (key === ',') { e.preventDefault(); setPanel('settings'); }
      else if (key === 'm' && e.shiftKey) { e.preventDefault(); source(); }
      else if (key === 'enter' && e.shiftKey) { e.preventDefault(); setFocus(x => !x); }
      else if (key === '\\') { e.preventDefault(); setSidebar(x => !x); }
      else if (key === 'f' && e.shiftKey) { e.preventDefault(); setSidebar(true); search.current?.focus(); }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });
  const filtered = ctx.documents.filter(d => `${d.title}\n${d.filename}\n${d.content}`.toLowerCase().includes(query.toLowerCase()));
  if (ctx.isLoading) return <div className="web-loading">Loading…</div>;
  return <div className="web-app" onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
    onDrop={e => { e.preventDefault(); setDragging(false); void ctx.importFiles(Array.from(e.dataTransfer.files)); }}>
    <input ref={fileInput} type="file" accept=".md,.markdown,text/markdown" multiple hidden onChange={e => { void ctx.importFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
    <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden onChange={e => { void addImages(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
    <header className="web-header">
      <button className="web-brand" onClick={() => setSidebar(x => !x)} aria-label="Toggle sidebar"><span className="web-logo">s.</span> Scratch <small>web</small></button>
      <div className="web-header-actions">
        <button onClick={() => fileInput.current?.click()}>Open file</button>
        <button onClick={() => setPanel('commands')} aria-label="Open command palette">⌘ P</button>
        <button onClick={cycleTheme} aria-label="Switch theme">◐</button>
        <button className="web-primary" disabled={!ctx.currentNote} onClick={download}>Download .md ↓</button>
      </div>
    </header>
    {ctx.recovered && <div className="web-recovered" role="status">Drafts restored.<button onClick={ctx.dismissRecovered} aria-label="Dismiss recovery message">×</button></div>}
    <main className={`web-main ${focus ? 'web-focus' : ''}`}>
      {sidebar && !focus && <aside className="web-sidebar" data-sidebar>
        <div className="web-sidebar-top"><span>DOCUMENTS <small>{ctx.documents.length}</small></span><button onClick={() => void ctx.createNote()} aria-label="New note">＋</button></div>
        <label className="web-search">⌕<input ref={search} placeholder="Search your documents…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search documents" /></label>
        <div className="web-documents">
          {filtered.map(doc => <div className={`web-document ${doc.id === ctx.selectedNoteId ? 'active' : ''}`} key={doc.id}>
            <button className="web-document-select" onClick={() => void ctx.selectNote(doc.id)}><strong>{doc.title}</strong><span>{doc.filename}{changed(doc) ? ' · edited' : ''}</span><p>{doc.content.replace(/^#+\s*/gm, '').slice(0, 85) || 'An empty page, ready for your thoughts.'}</p></button>
            <button className="web-rename" aria-label={`Rename ${doc.filename}`} title="Rename file" onClick={() => { const name = window.prompt('Rename file:', doc.filename); if (name !== null) ctx.renameNote(doc.id, name); }}>✎</button>
            <button className="web-close" aria-label={`Close ${doc.title}`} onClick={() => { if (changed(doc) || dirty.current.has(doc.id)) setClosing(doc.id); else ctx.closeNote(doc.id, false); }}>×</button>
          </div>)}
          {!filtered.length && <p className="web-list-empty">{query ? 'No matching documents.' : 'Open a Markdown file or start a new note.'}</p>}
        </div>
        <div className="web-sidebar-footer"><button onClick={() => setPanel('settings')}>⚙ Appearance</button></div>
      </aside>}
      <section className="web-editor-area">
        {ctx.currentNote ? <Editor sidebarVisible={sidebar} onToggleSidebar={() => setSidebar(x => !x)} focusMode={focus} /> : <div className="web-welcome"><span className="web-welcome-mark">s.</span><p className="web-eyebrow">A LITTLE SPACE TO THINK</p><h1>Make room for a thought.</h1><div><button className="web-primary" onClick={() => void ctx.createNote()}>＋ New note</button><button onClick={() => fileInput.current?.click()}>Open Markdown</button></div><small>or drop .md files anywhere</small></div>}
      </section>
    </main>
    <footer className="web-status"><span role="status">{ctx.storageStatus}</span><span>{ctx.currentNote ? (changed(ctx.currentNote) || dirty.current.has(ctx.currentNote.id) ? 'Changes since last open/download' : 'Matches opened/downloaded content') : 'No document selected'}</span><button onClick={() => setPanel('shortcuts')}>Shortcuts</button>{focus && <button onClick={() => setFocus(false)}>Exit focus</button>}</footer>
    {dragging && <div className="web-drop">Drop Markdown files to open</div>}
    {panel && <div className="web-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setPanel(null); }}><section className="web-panel" role="dialog" aria-modal="true" aria-label={panel} onKeyDown={e => {
      if (e.key === 'Tab') { const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')].filter(x => !x.hasAttribute('disabled')); const first = items[0], last = items[items.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    }}><header><h2>{panel === 'settings' ? 'Make yourself at home' : panel === 'commands' ? 'What would you like to do?' : 'Keyboard shortcuts'}</h2><button autoFocus onClick={() => setPanel(null)} aria-label="Close dialog">×</button></header>
      {panel === 'settings' ? <><div className="web-settings-note"><button onClick={() => imageInput.current?.click()}>Load companion images…</button><p>Select images referenced in your Markdown.</p><label><input type="checkbox" checked={remote} onChange={e => { setRemote(e.target.checked); allowRemoteImages(e.target.checked); }} /> Load external images</label></div><AppearanceSettingsSection /></> : commands.map(command => <button className="web-command" key={command.label} onClick={() => { setPanel(null); command.run(); }}><span>{command.label}</span><kbd>{command.shortcut}</kbd></button>)}
    </section></div>}
    {closing && <div className="web-overlay"><section className="web-panel web-confirm" role="alertdialog" aria-modal="true" aria-labelledby="close-title"><h2 id="close-title">Keep your changes?</h2><p>Download, keep the draft, or discard changes.</p><button autoFocus onClick={() => setClosing(null)}>Cancel</button><button onClick={() => { const id = closing; const doc = ctx.documents.find(d => d.id === id); setClosing(null); if (id === ctx.selectedNoteId) download(); else if (doc) void downloadMarkdown(doc.content, doc.filename).then(started => { if (started) ctx.markDownloaded(id, doc.content, started); }); }}>Download…</button><button onClick={() => { ctx.closeNote(closing, true); setClosing(null); }}>Keep draft</button><button className="web-danger" onClick={() => { ctx.closeNote(closing, false); setClosing(null); }}>Discard draft</button></section></div>}
  </div>;
}
export default function App() { return <ThemeProvider><TooltipProvider><Toaster /><NotesProvider><Workspace /></NotesProvider></TooltipProvider></ThemeProvider>; }
