import type { FrameStack } from '@common/types';

export interface PageStackStore {
  /** What each frame of the page runs, the top page first (mirrors the main process's inspector). */
  stacks: FrameStack[];

  setAll(stacks: FrameStack[]): void;
}
