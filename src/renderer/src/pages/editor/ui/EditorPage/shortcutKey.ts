/** The key a Ctrl/Cmd shortcut ends with, as a lower-cased `KeyboardEvent.key`: `['mod', 'K']` → `k`. */
export function shortcutKey(shortcut: string[]): string {
  return shortcut.at(-1)!.toLowerCase();
}
