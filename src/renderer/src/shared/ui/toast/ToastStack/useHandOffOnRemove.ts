// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useEffect, type RefObject } from 'react';
import { containsFocus } from './containsFocus';
import type { ToastCardProps } from './types';

/** Hands focus on from a card that goes away while focused. */
export function useHandOffOnRemove(
  cardRef: RefObject<HTMLLIElement | null>,
  isPresent: boolean,
  handOffFocus: ToastCardProps['handOffFocus'],
) {
  // Removed by code (`toast.dismiss(id)`) while focused: don't drop focus to <body>.
  useEffect(() => {
    if (!isPresent && cardRef.current && containsFocus(cardRef.current)) handOffFocus(cardRef.current, true);
  }, [cardRef, isPresent, handOffFocus]);
}
