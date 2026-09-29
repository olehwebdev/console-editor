import type { Shot } from '@common/types';

/** How two shots are shown: side by side, one swiped over the other, faded over it, or their difference. */
export type CompareMode = 'side' | 'swipe' | 'onion' | 'difference';

/** What every view of a comparison is given. */
export interface CompareViewProps {
  base: Shot;
  other: Shot;
  /** Shown pixels per CSS pixel. */
  zoom: number;
  /** Where the other sits on the base, in CSS pixels. */
  offset: { x: number; y: number };
}
