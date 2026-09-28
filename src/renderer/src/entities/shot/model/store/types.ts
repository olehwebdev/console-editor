import type { Shot } from '@common/types';

export interface ShotStore {
  /** The active workspace's captures and designs, newest first. */
  shots: Shot[];

  setAll(shots: Shot[]): void;
}
