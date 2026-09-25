import type { ResourceContent, SourceMapFetchFailure } from '../../shared/types';

/** How a file named its map. */
export type SourceMapVia = 'header' | 'comment';

export interface MapReference {
  value: string;
  via: SourceMapVia;
}

/** Finds the map URL a file's trailing comment names, as written. */
export type MapCommentFinder = (text: string) => string | null;

export interface SourceMapDeps {
  /** The bundle as the server sent it (upstream even when an override serves it), with its SourceMap header when seen. */
  content(url: string): Promise<ResourceContent>;
  /** A GET through the site's session. */
  fetch(url: string, init: { credentials: 'include' | 'omit'; signal: AbortSignal }): Promise<Response>;
  /** The top page's URL (whose origin, like the bundle's, gets the site's cookies). */
  pageUrl(): string;
}

export interface SourceMapLimits {
  maxMapBytes: number;
  maxInlineChars: number;
  /** Larger bundles aren't sent for lining up with their map: their originals can be browsed, not jumped to. */
  maxBundleChars: number;
  timeoutMs: number;
}

export type ResolvedMapUrl =
  | { type: 'inline'; dataUrl: string }
  | { type: 'remote'; url: string }
  | { type: 'failed'; failure: Extract<SourceMapFetchFailure, 'bad-url' | 'scheme' | 'too-large'>; detail: string };

export type FetchedMap = { bytes: Uint8Array } | { failure: SourceMapFetchFailure; detail: string };
