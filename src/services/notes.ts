import type { Settings } from '../types/note';
const key = 'scratch-web-settings';
export async function getSettings(): Promise<Settings> {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? { theme: { mode: 'system' } }; }
  catch { return { theme: { mode: 'system' } }; }
}
export async function updateSettings(settings: Settings): Promise<void> {
  localStorage.setItem(key, JSON.stringify(settings));
}
