import type { ConsoleEntry } from '@common/types';

export interface ConsoleStore {
  /** The rows kept, oldest first (at most `MAX_CONSOLE_ENTRIES`). */
  entries: ConsoleEntry[];

  append(entries: readonly ConsoleEntry[]): void;
  setAll(entries: readonly ConsoleEntry[]): void;
  clear(): void;
}
