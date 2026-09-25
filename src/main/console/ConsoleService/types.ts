import type { AppEvent, ConsoleEntry, ConsoleValue, Settings } from '../../../shared/types';
import type { ConsoleFrames } from '../ConsoleFrames';
import type { RemoteObject } from '../types';

export interface ConsoleServiceOptions {
  getSettings(): Settings;
  send(event: AppEvent): void;
}

/** A row before it is numbered: its values are made once its id is known (expandable values point back at it). */
export type NewEntry = Omit<ConsoleEntry, 'id' | 'time' | 'values'> & { time?: number };

/** A row to add: what it says, and how to make its values once its id is known. */
export interface RowDraft {
  entry: NewEntry;
  values: (entryId: number) => ConsoleValue[];
}

/** A remote value of one session as the renderer gets it, kept alive by the row `entryId`. */
export type ValueOf = (entryId: number, obj: RemoteObject) => ConsoleValue;

/** What a session's events feed: the frames, and new rows. */
export interface SessionSinks {
  frames: ConsoleFrames;
  /** Whether the console records now: events are ignored while it doesn't. */
  recording(): boolean;
  push(row: RowDraft): void;
  /** Values of that session's rows. */
  value: ValueOf;
}
