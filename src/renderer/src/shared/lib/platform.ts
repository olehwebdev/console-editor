export const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

/** Labels for the key names shortcuts are written with, by lowercase name; any other key shows as written, a single character upper-cased. */
const KEY_LABELS: Record<string, string> = {
  mod: isMac ? '⌘' : 'Ctrl',
  shift: isMac ? '⇧' : 'Shift',
  alt: isMac ? '⌥' : 'Alt',
  enter: '↵',
};

/** Shortcut label for the current platform: `mod` becomes ⌘ or Ctrl. */
export function keyLabel(key: string): string {
  const name = key.toLowerCase();
  if (Object.hasOwn(KEY_LABELS, name)) return KEY_LABELS[name];
  return key.length === 1 ? key.toUpperCase() : key;
}
