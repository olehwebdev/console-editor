import type { SourceMapFetchFailure } from '@common/types';
import type { OriginalSource, SourceMapParseFailure } from '@/shared/lib';

/** Why a bundle's map couldn't be shown: main couldn't hand it over, the worker couldn't read it, or the worker died. */
export type SourceMapFailure = SourceMapFetchFailure | SourceMapParseFailure | 'worker';

export type SourceMapState =
  | { status: 'loading' }
  | { status: 'none'; bundleHash: string }
  | { status: 'failed'; failure: SourceMapFailure; detail: string; mapUrl: string | null }
  | {
      status: 'ready';
      bundleHash: string;
      mapUrl: string | null;
      /** The file's name, when the map is one loaded from a file rather than the bundle's own. */
      file?: string;
      sources: OriginalSource[];
      /** The bundle was too large to send for lining up: its originals can be browsed, not jumped to. */
      browseOnly: boolean;
      /** Some mapped positions fall outside the bundle (a different build?). */
      mismatch: boolean;
      /** The store generation this map was last confirmed in. */
      checked: number;
    };

export interface SourceMapStore {
  /** By bundle URL, least recently set first. */
  byBundle: Record<string, SourceMapState>;
  /** Top-level page loads seen: ready maps confirmed in an older one are checked again on next use. */
  generation: number;

  /** Stores a bundle's state as the newest, then drops the oldest ones not loading beyond the limit. */
  set(bundleUrl: string, state: SourceMapState): void;
  /** Records that a ready map still matches its bundle in this generation. */
  markChecked(bundleUrl: string): void;
  markMismatch(bundleUrl: string): void;
  nextGeneration(): void;
  clear(): void;
}

/** A source of a loaded map, with the bundle it came from. */
export interface LoadedSource {
  bundleUrl: string;
  source: OriginalSource;
}
