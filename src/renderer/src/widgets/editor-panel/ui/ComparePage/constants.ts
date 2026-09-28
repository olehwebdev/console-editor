import type { PaneTab } from '@/shared/ui/pane-tabs';
import type { CompareMode } from './types';

export const COMPARE_MODES: readonly PaneTab<CompareMode>[] = [
  { id: 'side', label: 'Side by side' },
  { id: 'swipe', label: 'Swipe' },
  { id: 'onion', label: 'Onion skin' },
  { id: 'difference', label: 'Difference' },
];

/** Room around the images in the pane (their margin on each side). */
export const PANE_MARGIN = 48;

/** Where the swipe starts, and how opaque the onion skin's top image starts: halfway. */
export const HALFWAY = 0.5;

/** A range input's steps between 0 and 1. */
export const SLIDER_STEP = 0.01;
