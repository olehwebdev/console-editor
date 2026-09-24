import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactElement, Ref } from 'react';
import type { MenuAlign, MenuItem, MenuSide } from '../types';

/** The trigger's own props that `Menu` chains its handlers and ref onto. */
export type TriggerProps = {
  ref?: Ref<HTMLElement>;
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

export interface MenuProps {
  items: MenuItem[];
  /**
   * The trigger: one element that accepts `ref`, `onClick`, `onKeyDown` and
   * `aria-*` props (a native button, or `Button`/`IconButton`). It receives
   * `aria-haspopup`, `aria-expanded`, `aria-controls` and `data-state`.
   */
  children: ReactElement;
  /** Horizontal alignment against the trigger. Default `start`. */
  align?: MenuAlign;
  /** Preferred side; flips when there is no room. Default `bottom`. */
  side?: MenuSide;
  /** Controlled open state (optional). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Accessible name of the menu. */
  label?: string;
  /** Extra classes for the floating panel. */
  className?: string;
}
