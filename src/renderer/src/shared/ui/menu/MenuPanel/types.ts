// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { MenuAlign, MenuSide } from '../types';

/**
 * Where the panel opens: at a point (context menu) or against an element (dropdown).
 * A point anchor may name the element it was opened on (`within`), so only
 * scrolling that moves that element closes the menu.
 */
export type MenuAnchor =
  | { type: 'point'; x: number; y: number; within?: Element | null }
  | { type: 'element'; element: RefObject<HTMLElement | null>; align: MenuAlign; side: MenuSide };

/**
 * Why the panel asked to close. The owner restores focus for `select`, `escape`,
 * `tab` and `dismiss` (window blur, resize, or a scroll that moved the anchor
 * while focus was in the menu); `outside` and `blur` leave focus where the user put it.
 */
export type MenuCloseReason = 'select' | 'escape' | 'tab' | 'dismiss' | 'outside' | 'blur';

export type MenuInitialFocus = 'first' | 'last' | 'none';

export interface Placement {
  left: number;
  top: number;
  originX: number;
  originY: number;
}

/** What the menu's keys act on, read when the key is pressed. */
export interface MenuKeyActions {
  /** Indices of the rows that can be highlighted, in order. */
  enabled: readonly number[];
  /** Highlights a row by index; -1 for none. */
  setActive: (index: number) => void;
  /** Moves the highlight one enabled row down (1) or up (-1), wrapping around. */
  move: (direction: 1 | -1) => void;
  /** Runs the highlighted row, if any. */
  chooseActive: () => void;
  /** A typeahead is under way, so Space types instead of choosing. */
  typing: boolean;
  runTypeahead: (key: string) => void;
  onClose: (reason: MenuCloseReason) => void;
}

export type MenuKeyHandler = (event: ReactKeyboardEvent<HTMLDivElement>, menu: MenuKeyActions) => void;
