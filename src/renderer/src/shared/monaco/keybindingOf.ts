import { monaco } from './setup';

/** Monaco's modifiers for the shortcut notation's names (see SHORTCUT in src/shared/constants.ts). */
const KEY_MODIFIER: Record<string, number> = {
  mod: monaco.KeyMod.CtrlCmd,
  shift: monaco.KeyMod.Shift,
  alt: monaco.KeyMod.Alt,
  ctrl: monaco.KeyMod.WinCtrl,
};

/** `['mod', 'shift', 'D']` → `KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyD`, for a Monaco action. Letter keys only. */
export function keybindingOf(keys: string[]): number {
  return keys.reduce(
    (binding, key) =>
      binding | (Object.hasOwn(KEY_MODIFIER, key) ? KEY_MODIFIER[key] : monaco.KeyCode[`Key${key.toUpperCase()}` as keyof typeof monaco.KeyCode]),
    0,
  );
}
