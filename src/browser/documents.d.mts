import type { WebDocument } from './storage';
export function filename(value: string): string;
export function title(content: string, name: string): string;
export function updateDocument(doc: WebDocument, content: string): WebDocument;
export function changed(doc: WebDocument): boolean;
export function restoreDocuments(value: unknown): WebDocument[];
export function renameDocument(doc: WebDocument, name: string): WebDocument;
export function recordDownload(doc: WebDocument, content: string, name: string): WebDocument;
