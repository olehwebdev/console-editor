import type { ConsoleAction } from '@common/types';

export interface ActionStore {
  /** The active workspace's actions, oldest first. */
  actions: ConsoleAction[];

  setAll(actions: ConsoleAction[]): void;
}
