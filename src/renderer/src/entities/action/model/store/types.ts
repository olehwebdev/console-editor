import type { ActionsWindowState, ConsoleAction } from '@common/types';

export interface ActionStore {
  /** The active workspace's actions, oldest first. */
  actions: ConsoleAction[];
  /** Where the Actions panel is: docked in the sidebar, or in a window of its own. */
  window: ActionsWindowState;

  setAll(actions: ConsoleAction[]): void;
  setWindow(window: ActionsWindowState): void;
}
