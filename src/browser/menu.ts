// Accessible DOM menu for the shared editor's table commands.
type Item = { text?: string; action?: () => void; enabled?: boolean; item?: string };
export class MenuItem { static async new(item: Item) { return item; } }
export class PredefinedMenuItem { static async new(item: Item) { return item; } }
let point = { x: 0, y: 0 };
window.addEventListener('contextmenu', e => { point = { x: e.clientX, y: e.clientY }; }, true);
export class Menu {
  static async new(options: { items: Item[] }) { return new Menu(options.items); }
  constructor(private items: Item[]) {}
  async popup() {
    const menu = document.createElement('div');
    menu.className = 'browser-table-menu'; menu.setAttribute('role', 'menu');
    menu.style.left = `${Math.min(point.x, innerWidth - 230)}px`;
    menu.style.top = `${Math.min(point.y, innerHeight - 300)}px`;
    const dismiss = () => { menu.remove(); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); };
    const outside = (e: Event) => { if (!menu.contains(e.target as Node)) dismiss(); };
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); const buttons = [...menu.querySelectorAll('button:not(:disabled)')];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        (buttons[(index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length] as HTMLButtonElement)?.focus();
      }
    };
    for (const item of this.items) {
      if (item.item === 'Separator') { menu.append(document.createElement('hr')); continue; }
      const button = document.createElement('button'); button.textContent = item.text ?? ''; button.setAttribute('role', 'menuitem');
      button.disabled = item.enabled === false;
      button.onclick = () => { dismiss(); item.action?.(); }; menu.append(button);
    }
    document.body.append(menu); menu.querySelector('button')?.focus();
    setTimeout(() => document.addEventListener('pointerdown', outside), 0);
    document.addEventListener('keydown', keyboard);
  }
}
