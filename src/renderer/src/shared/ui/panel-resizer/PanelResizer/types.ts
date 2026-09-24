import type { KeyboardEvent } from 'react';

export type PanelResizerOrientation = 'vertical' | 'horizontal';

/** What a key on the handle acts on, read when it is pressed. */
export interface ResizerKeyContext {
  /** One arrow-key step: `largeStep` with Shift, else `step`. */
  amount: number;
  value: number | undefined;
  min: number | undefined;
  max: number | undefined;
  onReset: (() => void) | undefined;
  /** Takes the key and reports a resize by `delta` px (nothing for 0). */
  resize: (delta: number) => void;
}

export type ResizerKeyHandler = (event: KeyboardEvent<HTMLDivElement>, resizer: ResizerKeyContext) => void;
