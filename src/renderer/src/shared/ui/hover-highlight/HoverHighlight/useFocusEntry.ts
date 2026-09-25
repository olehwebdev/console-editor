// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useState, type FocusEvent, type FocusEventHandler, type KeyboardEvent, type KeyboardEventHandler } from 'react';
import { KEY } from '@/shared/config';
import { pickEntryRow } from './pickEntryRow';

/** Keys that, pressed on the container itself, move focus into its rows. */
const ENTRY_KEYS: ReadonlySet<string> = new Set([KEY.arrowDown, KEY.arrowUp, KEY.home, KEY.end]);

interface FocusEntryOptions {
  /** The container is its rows' keyboard entry point. */
  entry: boolean;
  onFocus?: FocusEventHandler<HTMLDivElement>;
  onBlur?: FocusEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}

/**
 * Makes the container a Tab stop that hands focus on to a row (and steps out of
 * the tab order while focus is inside). Wraps the caller's own handlers.
 */
export function useFocusEntry({ entry, onFocus, onBlur, onKeyDown }: FocusEntryOptions) {
  const [focusWithin, setFocusWithin] = useState(false);

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    if (!entry) return;
    const container = event.currentTarget;
    if (event.target !== container) {
      setFocusWithin(true);
      return;
    }
    // Only forward keyboard arrivals; a click on the padding must not jump the scroll.
    if (container.matches(':focus-visible')) pickEntryRow(container)?.focus();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (!entry) return;
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) setFocusWithin(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!entry || event.defaultPrevented || event.target !== event.currentTarget) return;
    if (ENTRY_KEYS.has(event.key)) {
      const row = pickEntryRow(event.currentTarget);
      if (row) {
        event.preventDefault();
        row.focus();
      }
    }
  };

  return { focusWithin, handleFocus, handleBlur, handleKeyDown };
}
