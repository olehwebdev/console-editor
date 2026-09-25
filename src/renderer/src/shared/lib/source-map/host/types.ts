import type { TraceMap } from '@jridgewell/trace-mapping';
import type { SourceMapParseFailure, SourceMapRequestOf, SourceMapRequestType, SourceMapWorkerReplies } from '../types';

/** One entry of a map's `sources`, as read: its resolved URL (null for a null entry), text and ignore-listing. */
export interface SourceRecord {
  url: string | null;
  content: string | null;
  ignored: boolean;
}

/** A tab's text lined up with the raw bundle: same code characters, except in an edited middle. */
export interface Alignment {
  /** The view version it was built for. */
  key: string;
  text: string;
  /** Offsets of the text's non-whitespace characters. */
  code: Uint32Array;
  /** How many code characters, from the start and from the end, are the same in both. */
  prefix: number;
  suffix: number;
}

export interface LoadedMap {
  trace: TraceMap;
  /** By synthetic id (the index the rewritten map lists it at). */
  records: SourceRecord[];
  /** Every synthetic id per resolved URL: a map may list a file more than once. */
  byUrl: Map<string, number[]>;
  /** The bundle text the map describes; null when too large to send (browse only). */
  raw: string | null;
  rawLineStarts: Uint32Array | null;
  /** Offsets of the raw text's non-whitespace characters, built on the first jump. */
  rawCode?: Uint32Array;
  /** The last tab text lined up with it. */
  alignment?: Alignment;
  mapBytes: number;
  /** Whether many positions fall outside the bundle (another build's map?), computed on the first jump. */
  mismatch?: boolean;
}

/** By bundle URL, least recently used first. */
export type LoadedMaps = Map<string, LoadedMap>;

export type SourceMapHandlers = {
  [T in SourceMapRequestType]: (maps: LoadedMaps, request: SourceMapRequestOf<T>) => SourceMapWorkerReplies[T];
};

export type Parsed<T> = { ok: true; value: T } | { ok: false; failure: SourceMapParseFailure; detail: string };
