import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { isConfirmOpen } from '@/shared/ui/dialog';
import { focusToasts } from '@/shared/ui/toast';

/** The palette hotkey's `event.key`, lowercased (Shift or Caps Lock may capitalize it). */
const PALETTE_KEY = 'k';
/** Alt+N is matched by `event.code`: on macOS, Alt turns N into a dead key. */
const FOCUS_TOASTS_CODE = 'KeyN';

/** Mod+K toggles the demo palette; Alt+N moves focus to the toast stack. */
export function useGalleryHotkeys(setPaletteOpen: Dispatch<SetStateAction<boolean>>) {
  // Gallery-only hotkeys; the app binds its own. Held keys and an open confirm dialog are ignored.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isConfirmOpen()) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === PALETTE_KEY) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.altKey && event.code === FOCUS_TOASTS_CODE) {
        if (focusToasts()) event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setPaletteOpen]);
}
