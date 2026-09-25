import type { RenderCommit } from '@common/types';
import type { Profiles } from '../../lib/profile';

/** React's commits recorded in the page's frames (mirrors the main process's recorder). */
export interface RenderLogStore {
  recording: boolean;
  /** Oldest first: the last `MAX_COMMITS`. */
  commits: RenderCommit[];
  /** The same commits by component, kept as they come and go (the profiler's view). */
  profiles: Profiles;

  setRecording(recording: boolean): void;
  add(commits: RenderCommit[]): void;
  clear(): void;
}
