// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/** Marks a card playing its exit; it no longer takes focus. */
export const EXITING_ATTR = 'data-exiting';
/** How cards move (and stacked backgrounds squeeze) as the stack collapses and fans out. */
export const STACK_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.75 } as const;
