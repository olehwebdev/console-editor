import { AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { PopoverPanel } from './PopoverPanel';
import type { PopoverProps } from './types';

/**
 * A small panel of controls beside an element (e.g. editing what a rail tile
 * shows). Not modal: it closes on Esc, on a press or focus outside it and its
 * anchor, and when the window loses focus or resizes. Like menus, it swaps the
 * page view for a still while open.
 */
export function Popover(props: PopoverProps) {
  return createPortal(<AnimatePresence>{props.open ? <PopoverPanel {...props} /> : null}</AnimatePresence>, document.body);
}
