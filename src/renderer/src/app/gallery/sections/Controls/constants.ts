import { BUTTON_ICON_SIZE } from '@/shared/ui/button';

/** Glyph size for an icon in a control's leading/trailing slot, by the control's size: the button's own (inputs match it). */
export const SLOT_ICON_SIZE = BUTTON_ICON_SIZE;

/**
 * Shortcuts the demos show, in Kbd's notation (`mod` is ⌘ on macOS, Ctrl elsewhere).
 * Not `as const`: Kbd, Tooltip and IconButton take a mutable `string[]`.
 */
export const SHORTCUT = {
  save: ['mod', 'S'],
  compare: ['mod', 'D'],
  reload: ['mod', 'R'],
  editorDevTools: ['mod', 'alt', 'I'],
  pageDevTools: ['mod', 'shift', 'J'],
  prettify: ['shift', 'alt', 'F'],
  palette: ['mod', 'K'],
  quickOpen: ['mod', 'P'],
  explorer: ['mod', 'shift', 'E'],
  search: ['mod', 'shift', 'F'],
} satisfies Record<string, string[]>;
