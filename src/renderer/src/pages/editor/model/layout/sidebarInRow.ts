import type { FitInput } from './types';

/** The sidebar takes room in the row: shown, or still animating out. */
export const sidebarInRow = (l: FitInput) => !!l.sidebar || !!l.sidebarLeaving;
