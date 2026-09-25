import type { ConsoleEntry } from '@common/types';

/** The last run of an action, as its row shows it. */
export type ActionRun =
  /** Sent to its frame; waiting for what it gives back. */
  | { state: 'running' }
  /** It ran: the row of what it gave back, or of what it threw (an `error` row). */
  | { state: 'done'; entry: ConsoleEntry }
  /** It couldn't run: its frame isn't on the page, or runs no JavaScript. */
  | { state: 'failed'; message: string };

export interface ActionRunStore {
  /** By action id; an action never run has none. */
  runs: Record<string, ActionRun>;
  setRun(id: string, run: ActionRun): void;
}
