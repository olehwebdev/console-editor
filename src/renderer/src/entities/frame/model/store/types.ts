import type { ConsoleFrame } from '@common/types';

export interface FrameStore {
  /** The page's frames now, the top page first. */
  frames: ConsoleFrame[];
  /** Every frame seen this run, by id: a row keeps its frame's label after the frame goes away. */
  seen: Record<string, ConsoleFrame>;

  setAll(frames: ConsoleFrame[]): void;
}
