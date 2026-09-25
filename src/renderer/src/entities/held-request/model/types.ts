import type { HeldRequest } from '@common/types';

export interface HeldStore {
  /** The requests breakpoints hold now, oldest first (the main process's list, sent whole). */
  held: HeldRequest[];
  setAll(held: HeldRequest[]): void;
}
