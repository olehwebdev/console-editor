/** Electron's names for the modifiers the shortcut notation uses (see SHORTCUT in src/shared/constants.ts). */
const ACCELERATOR_MODIFIER: Record<string, string> = {
  mod: 'CmdOrCtrl',
  shift: 'Shift',
  alt: 'Alt',
  ctrl: 'Ctrl',
  cmd: 'Cmd',
};

/** `['mod', 'shift', 'D']` → `CmdOrCtrl+Shift+D`, for a menu item's `accelerator`. */
export function toAccelerator(keys: string[]): string {
  return keys.map((key) => (Object.hasOwn(ACCELERATOR_MODIFIER, key) ? ACCELERATOR_MODIFIER[key] : key)).join('+');
}
