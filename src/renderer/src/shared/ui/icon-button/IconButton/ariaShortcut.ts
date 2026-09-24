import { KEY } from '@/shared/config';
import { isMac } from '@/shared/lib';

const ARIA_KEY: Record<string, string> = {
  mod: isMac ? 'Meta' : 'Control',
  ctrl: 'Control',
  cmd: 'Meta',
  shift: 'Shift',
  alt: 'Alt',
  enter: KEY.enter,
  esc: KEY.escape,
};

/** `['mod', 'S']` → `Meta+S` / `Control+S` for `aria-keyshortcuts`. */
export function ariaShortcut(keys: string[]): string {
  return keys.map((k) => ARIA_KEY[k.toLowerCase()] ?? (k.length === 1 ? k.toUpperCase() : k)).join('+');
}
