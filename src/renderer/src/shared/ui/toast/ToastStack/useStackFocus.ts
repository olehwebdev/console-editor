// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useCallback, useEffect, useRef, type FocusEvent as ReactFocusEvent, type RefObject } from 'react';
import { focusFrontCard } from './focusFrontCard';
import { focusHost } from './focusHost';
import { focusNeighbour } from './focusNeighbour';

/**
 * Focus in and out of the stack: tracks whether it is inside, remembers where it
 * came from, hands it on when a focused card goes, and serves `focusToasts()`.
 */
export function useStackFocus(listRef: RefObject<HTMLOListElement | null>, setFocused: (focused: boolean) => void) {
  /** Where focus was before it entered the stack; it goes back there when the stack lets go. */
  const returnFocus = useRef<HTMLElement | null>(null);

  /** Focus is leaving `card` (dismissed, or going away): to a neighbouring card, else back out. */
  const handOffFocus = useCallback(
    (card: HTMLElement, toNeighbour: boolean) => {
      if (toNeighbour && focusNeighbour(listRef.current, card)) return;
      const back = returnFocus.current;
      returnFocus.current = null;
      if (back && back !== document.body && back.isConnected) back.focus({ preventScroll: true });
      else if (document.activeElement instanceof HTMLElement && card.contains(document.activeElement)) document.activeElement.blur();
    },
    [listRef],
  );

  // While mounted, `focusToasts()` focuses this stack's front card.
  useEffect(() => {
    const focusFront = () => focusFrontCard(listRef.current, returnFocus);
    focusHost.current = focusFront;
    return () => {
      if (focusHost.current === focusFront) focusHost.current = null;
    };
  }, [listRef]);

  const onFocus = (event: ReactFocusEvent<HTMLOListElement>) => {
    setFocused(true);
    const from = event.relatedTarget;
    if (from instanceof Node && event.currentTarget.contains(from)) return;
    if (from instanceof HTMLElement && from !== document.body) returnFocus.current = from;
  };

  const onBlur = (event: ReactFocusEvent<HTMLOListElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return { handOffFocus, onFocus, onBlur };
}
