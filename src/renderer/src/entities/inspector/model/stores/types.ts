import type { StoreAction } from '@common/types';

/** The actions the page's stores handled, as recorded (mirrors the main process's recorder). */
export interface StoreLogStore {
  recording: boolean;
  /** Oldest first: the last `MAX_ACTIONS`. */
  actions: StoreAction[];

  setRecording(recording: boolean): void;
  add(actions: StoreAction[]): void;
  clear(): void;
}
