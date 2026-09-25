// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { Transition, Variants } from 'motion/react';
import { DURATION, EASE_OUT } from '@/shared/lib';

/** Carries the tab's id, for finding its element. */
export const TAB_ID_ATTR = 'data-tab-id';
/** Marks a tab playing its close animation; keyboard navigation skips it. */
export const EXITING_ATTR = 'data-exiting';

export const INSTANT: Transition = { duration: 0 };
export const FADE: Transition = { duration: DURATION.short4, ease: EASE_OUT };

// The wrapper animates width (siblings slide); the content fades. The active
// pill sits outside the fading content so it glides at full opacity.
/** The variants a tab animates between: its reveal completing is when it scrolls into view. */
export const VARIANT = { hidden: 'hidden', shown: 'shown' } as const;
export const CONTENT: Variants = { [VARIANT.hidden]: { opacity: 0 }, [VARIANT.shown]: { opacity: 1 } };
