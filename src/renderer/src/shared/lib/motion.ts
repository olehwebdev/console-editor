/**
 * Motion presets (ported from beUI's `lib/ease.ts`, MIT, © 2026 Saurabh Chauhan).
 * Strong custom curves: stock ease-in/ease-out feel weak.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** Press feedback on buttons and other tappable surfaces. */
export const SPRING_PRESS = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const;
/** Content swaps: label/icon slots trading places inside a control. */
export const SPRING_SWAP = { type: 'spring', stiffness: 460, damping: 30, mass: 0.55 } as const;
/** Overlay panel entrances: menus, palette, dialogs. */
export const SPRING_PANEL = { type: 'spring', stiffness: 420, damping: 40, mass: 0.5 } as const;
/** Shared-layout glides: active pills, indicators, hover highlights. */
export const SPRING_LAYOUT = { type: 'spring', stiffness: 360, damping: 32, mass: 0.6 } as const;

export const DURATION = { fast: 0.12, base: 0.18, slow: 0.28 } as const;

/** Fade + short rise used by most appearing elements. */
export const FADE_UP = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: DURATION.base, ease: EASE_OUT },
} as const;
