// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useRef, type FocusEvent, type MouseEvent } from 'react';
import { MOUSE_BUTTON } from '@/shared/config';
import type { TabProps } from './types';

const TABLIST = '[role="tablist"]';

type MouseFocusOptions = Pick<TabProps, 'draggable' | 'onSelect' | 'onReveal'> & { id: string };

/**
 * A click must never park focus on a tab: it would steal focus from the editor
 * (which the integrator may have just focused) and the next Delete meant for the
 * code would close the file. So mousedown keeps focus where it is; only when
 * focus is already in the strip (keyboard use) does it follow the click.
 */
export function useTabMouseFocus({ id, draggable, onSelect, onReveal }: MouseFocusOptions) {
  const mouseFocus = useRef(false);

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const tab = event.currentTarget;
    if (event.button === MOUSE_BUTTON.primary) onSelect(id);
    if (event.button === MOUSE_BUTTON.primary && draggable) {
      // Cancelling mousedown would also cancel the native drag, so let the
      // browser focus the tab and hand focus back in handleFocus.
      mouseFocus.current = true;
      window.setTimeout(() => {
        mouseFocus.current = false;
      }, 0);
      return;
    }
    event.preventDefault(); // also: no middle-click autoscroll (auxclick closes)
    if (event.button === MOUSE_BUTTON.primary && tab.closest(TABLIST)?.contains(document.activeElement)) tab.focus({ preventScroll: true });
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const tab = event.currentTarget;
    const from = event.relatedTarget;
    if (mouseFocus.current) {
      mouseFocus.current = false;
      if (!(from instanceof Node && tab.closest(TABLIST)?.contains(from))) {
        // Deferred: moving focus while the button is still down cancels the drag.
        window.setTimeout(() => {
          if (document.activeElement !== tab) return;
          if (from instanceof HTMLElement && from.isConnected) from.focus({ preventScroll: true });
          else tab.blur();
        }, 0);
        return;
      }
    }
    onReveal(tab);
  };

  return { handleMouseDown, handleFocus };
}
