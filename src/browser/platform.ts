// Browser replacements for the few platform operations used by the shared editor.
export async function invoke<T = void>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (command === 'set_title_bar_theme') return undefined as T;
  if (command === 'copy_to_clipboard') {
    await navigator.clipboard.writeText(String(args?.text ?? ''));
    return undefined as T;
  }
  if (command === 'get_notes_folder') return '' as T;
  if (command === 'copy_image_to_assets') return args?.sourcePath as T;
  if (command === 'save_clipboard_image') return `data:image/png;base64,${args?.base64Data}` as T;
  throw new Error(`Unsupported browser operation: ${command}`);
}
export function convertFileSrc(path: string) { return path; }
export async function join(...parts: string[]) { return parts.filter(Boolean).join('/'); }
export async function openUrl(url: string) {
  if (!['http:', 'https:', 'mailto:'].includes(new URL(url).protocol)) throw new Error('Unsupported URL');
  window.open(url, '_blank', 'noopener,noreferrer');
}
export function readImage(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return Promise.reject(new Error('Choose a PNG, JPEG, GIF, or WebP image.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
export async function open(_options?: unknown): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/png,image/jpeg,image/gif,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try { resolve(await readImage(file)); } catch { resolve(null); }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
