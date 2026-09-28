import type { PaneTab } from '@/shared/ui/pane-tabs';
import type { GroupView } from './types';

/** Captures in a group aren't moved against the baseline: they were taken at the same address and viewport. */
export const NO_OFFSET = { x: 0, y: 0 } as const;

/** What each cell shows: the captures, or how each differs from the baseline. */
export const GROUP_VIEWS: readonly PaneTab<GroupView>[] = [
  { id: 'captures', label: 'Captures' },
  { id: 'differences', label: 'Differences' },
];
