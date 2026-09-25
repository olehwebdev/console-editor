/** Commits the log draws, the newest; older ones stay kept until cleared. */
export const MAX_SHOWN = 200;
/** Digits a commit's render time is shown with (ms). */
export const DURATION_DIGITS = 1;
/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
export const NO_NAMES: Readonly<Record<string, string>> = {};
