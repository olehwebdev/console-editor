// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useEffect } from 'react';
import type { MenuCloseReason, MenuPanelRefs } from './types';

/**
 * Closes the menu on what happens outside it: a pointer-down elsewhere, a scroll
 * that moves its anchor, a resize or a window blur.
 */
export function useMenuDismiss({ panelRef, ignoreRef, live, typeahead, blurCheck }: MenuPanelRefs) {
  // Window listeners for as long as the panel is mounted; unmounting also drops the pending timers.
  useEffect(() => {
    const close = (reason: MenuCloseReason) => {
      if (live.current.isPresent) live.current.onClose(reason);
    };
    const focusInside = () => {
      if (blurCheck.current.pending) return true; // it just left for nowhere, i.e. the window
      const focused = document.activeElement;
      return !!focused && focused !== document.body && !!panelRef.current?.contains(focused);
    };
    // Closed by the environment: hand focus back only if the menu had it.
    const dismiss = () => close(focusInside() ? 'dismiss' : 'outside');
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || panelRef.current?.contains(target) || ignoreRef?.current?.contains(target)) return;
      close('outside');
    };
    // The panel is `fixed`: once whatever holds its anchor scrolls, it would float detached.
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node) || panelRef.current?.contains(target)) return;
      const { anchor } = live.current;
      const anchorEl = anchor.type === 'element' ? anchor.element.current : anchor.within;
      if (anchorEl && !target.contains(anchorEl)) return;
      dismiss();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    const ta = typeahead.current;
    const check = blurCheck.current;
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
      window.clearTimeout(ta.timer);
      window.clearTimeout(check.timer);
    };
  }, [panelRef, ignoreRef, live, typeahead, blurCheck]);
}
