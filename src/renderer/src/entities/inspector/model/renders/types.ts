import type { RenderCommit } from '@common/types';

/** React's commits recorded in the page's frames (mirrors the main process's recorder). */
export interface RenderLogStore {
  recording: boolean;
  /** Oldest first: the last `MAX_COMMITS`. */
  commits: RenderCommit[];

  setRecording(recording: boolean): void;
  add(commits: RenderCommit[]): void;
  clear(): void;
}
