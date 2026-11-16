import type { Note } from '../types/note';
import { restoreDocuments } from './documents.mjs';
export interface WebDocument extends Note {
  filename: string;
  downloadedContent: string | null;
}
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('scratch-web', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Scratch tabs to enable draft storage.'));
  });
}
export async function loadDrafts(): Promise<WebDocument[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('drafts').objectStore('drafts').get('session');
    request.onsuccess = () => {
      try { resolve(restoreDocuments(request.result ?? [])); } catch (error) { reject(error); }
    };
    request.onerror = () => reject(request.error);
  });
}
export async function storeDrafts(docs: WebDocument[]) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readwrite');
    transaction.objectStore('drafts').put(docs, 'session');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
