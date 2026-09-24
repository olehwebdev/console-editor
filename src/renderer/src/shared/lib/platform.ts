export const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

/** Shortcut label for the current platform: `mod` becomes ⌘ or Ctrl. */
export function keyLabel(key: string): string {
  switch (key.toLowerCase()) {
    case 'mod':
      return isMac ? '⌘' : 'Ctrl';
    case 'shift':
      return isMac ? '⇧' : 'Shift';
    case 'alt':
      return isMac ? '⌥' : 'Alt';
    case 'enter':
      return '↵';
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}
