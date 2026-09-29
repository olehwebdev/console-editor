import type { PaneTab } from '@/shared/ui/pane-tabs';
import type { ShotFilter } from './types';

/** The menu's segments. */
export const SHOT_FILTERS: readonly PaneTab<ShotFilter>[] = [
  { id: 'all', label: 'All' },
  { id: 'capture', label: 'Captures' },
  { id: 'design', label: 'Designs' },
];

/** How many of the latest shots' thumbnails the button stacks. */
export const STACK_SIZE = 3;

/** The side of a thumbnail in the button's stack, and in a row, in pixels. */
export const STACK_THUMB = 18;
export const ROW_THUMB = 40;

/** What a drag carrying files says it carries. */
export const FILES_TYPE = 'Files';
