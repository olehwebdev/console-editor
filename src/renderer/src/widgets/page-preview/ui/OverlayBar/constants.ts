import { KEY } from '@/shared/config';

/** Nudging the design with the arrow keys (the bar focused): how far each moves it, in CSS pixels. */
export const NUDGE: Readonly<Record<string, { x: number; y: number }>> = {
  [KEY.arrowLeft]: { x: -1, y: 0 },
  [KEY.arrowRight]: { x: 1, y: 0 },
  [KEY.arrowUp]: { x: 0, y: -1 },
  [KEY.arrowDown]: { x: 0, y: 1 },
};

/** Shift nudges this many times as far. */
export const SHIFT_NUDGE = 10;

/** The opacity slider's step. */
export const OPACITY_STEP = 0.05;
