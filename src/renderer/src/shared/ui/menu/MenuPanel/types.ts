// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { MenuAlign, MenuItem, MenuSide } from '../types';

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

export interface MenuPanelProps {
  id: string;
  items: MenuItem[];
  anchor: MenuAnchor;
  /** Keyboard-opened menus start on the first (or, via ArrowUp, the last) item; pointer-opened ones start with no highlight. */
  initialFocus: MenuInitialFocus;
  onClose: (reason: MenuCloseReason) => void;
  /** Pointer-downs and focus moves into this element don't count as "outside" (the dropdown's trigger). */
  ignoreRef?: RefObject<HTMLElement | null>;
  label?: string;
  className?: string;
}

/** The panel's latest props, for the window listeners and timers, which are bound once. */
export interface MenuLive {
  onClose: (reason: MenuCloseReason) => void;
  isPresent: boolean;
  anchor: MenuAnchor;
}

/** What has been typed so far, and the timer that clears it. */
export interface TypeaheadState {
  buffer: string;
  timer: number;
}

/** A focus loss with no new target, waiting to be told apart from a window blur. */
export interface BlurCheck {
  timer: number;
  pending: boolean;
}

/** The panel's element and the state its listeners and timers share. */
export interface MenuPanelRefs {
  panelRef: RefObject<HTMLDivElement | null>;
  ignoreRef?: RefObject<HTMLElement | null>;
  live: RefObject<MenuLive>;
  typeahead: RefObject<TypeaheadState>;
  blurCheck: RefObject<BlurCheck>;
}

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
