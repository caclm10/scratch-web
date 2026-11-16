import { toast } from 'sonner';
import { readImage } from './platform';
const images = new Map<string, string>();
let allowRemote = false;
export function imageSource(src: string) {
  if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src)) return src;
  if (allowRemote && /^https?:\/\//i.test(src)) return src;
  const direct = images.get(src);
  if (direct) return direct;
  try { return images.get(decodeURIComponent(src).split('/').pop() ?? '') ?? ''; } catch { return ''; }
}
export async function addImages(files: File[]) {
  for (const file of files) {
    try { images.set(file.name, await readImage(file)); }
    catch (error) { toast.error(String(error)); }
  }
  window.dispatchEvent(new Event('images-changed'));
}
export function allowRemoteImages(enabled: boolean) { allowRemote = enabled; window.dispatchEvent(new Event('images-changed')); }

export function refreshImages(root: HTMLElement) {
  root.querySelectorAll<HTMLImageElement>('img[data-original-src]').forEach(img => {
    const src = imageSource(img.dataset.originalSrc ?? '');
    if (src) img.src = src; else img.removeAttribute('src');
  });
}
