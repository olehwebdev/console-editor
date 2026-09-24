/**
 * Shortcuts the demos show, in Kbd's notation (`mod` is ⌘ on macOS, Ctrl elsewhere).
 * Not `as const`: MenuItem, CommandGroup and Kbd take a mutable `string[]`.
 */
export const SHORTCUT = {
  save: ['mod', 'S'],
  format: ['shift', 'alt', 'F'],
  copyUrl: ['mod', 'shift', 'C'],
  open: ['enter'],
  reload: ['mod', 'R'],
  settings: ['mod', ','],
  palette: ['mod', 'K'],
  focusToasts: ['alt', 'N'],
} satisfies Record<string, string[]>;
