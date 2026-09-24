import { MAX_CONSOLE_ENTRIES } from '../../../shared/constants';
import type { ConsoleEntry, ConsoleValue } from '../../../shared/types';
import type { SessionKey } from '../ConsoleFrames';
import { EXPANDABLE_KINDS } from '../constants';
import { kindOf } from '../kindOf';
import type { ObjectHandle, RemoteObject } from '../types';
import { valueText } from '../valueText';
import type { NewEntry, ValueOf } from './types';

/**
 * The rows kept for a renderer that (re)starts, the most recent `MAX_CONSOLE_ENTRIES`
 * in id order, and the handles of their expandable values, dropped with their row.
 */
export class EntryLog {
  private entries: ConsoleEntry[] = [];
  private nextEntryId = 1;
  private nextHandle = 1;
  private readonly handles = new Map<number, ObjectHandle>();
  /** Row id -> the handles of its values, dropped with the row. */
  private readonly handlesOf = new Map<number, number[]>();

  /** Numbers a row, makes its values and keeps it; the oldest rows past the limit drop off. */
  add(entry: NewEntry, values: (entryId: number) => ConsoleValue[]): ConsoleEntry {
    const id = this.nextEntryId++;
    const row: ConsoleEntry = { ...entry, id, time: entry.time ?? Date.now(), values: values(id) };
    this.entries.push(row);
    const over = this.entries.length - MAX_CONSOLE_ENTRIES;
    if (over > 0) for (const old of this.entries.splice(0, over)) this.dropHandles(old.id);
    return row;
  }

  list(): ConsoleEntry[] {
    return [...this.entries];
  }

  /** A remote value as the renderer gets it; an object gets a handle for listing its properties later. */
  value(sessionId: SessionKey, entryId: number, obj: RemoteObject): ConsoleValue {
    const kind = kindOf(obj);
    const value: ConsoleValue = { kind, text: valueText(obj) };
    if (!obj.objectId || !EXPANDABLE_KINDS.has(kind)) return value;
    const handle = this.nextHandle++;
    this.handles.set(handle, { sessionId, objectId: obj.objectId, entryId });
    const own = this.handlesOf.get(entryId);
    if (own) own.push(handle);
    else this.handlesOf.set(entryId, [handle]);
    return { ...value, handle };
  }

  /** `value` for the rows of one session. */
  valueIn(sessionId: SessionKey): ValueOf {
    return (entryId, obj) => this.value(sessionId, entryId, obj);
  }

  /** The object a handle stands for, while its row is kept. */
  handle(handle: number): ObjectHandle | undefined {
    return this.handles.get(handle);
  }

  /** Whether a row is still kept (rows are kept in id order). */
  holds(entryId: number): boolean {
    const first = this.entries[0]?.id;
    return first !== undefined && entryId >= first && entryId <= this.entries.at(-1)!.id;
  }

  /** Drops every row, and the handles of their values. */
  clear(): void {
    this.entries = [];
    this.handles.clear();
    this.handlesOf.clear();
  }

  private dropHandles(entryId: number): void {
    for (const handle of this.handlesOf.get(entryId) ?? []) this.handles.delete(handle);
    this.handlesOf.delete(entryId);
  }
}
