import type { SourceMapBody } from '@common/types';

/** An original file a map lists, once per resolved URL. */
export interface OriginalSource {
  /** Resolved URL (DevTools rules), or the raw `sources` entry when it doesn't parse: its identity in the map. */
  url: string;
  /** The map carries its text (sourcesContent) in at least one copy. */
  hasContent: boolean;
  /** Every copy is ignore-listed (ignoreList / x_google_ignoreList), or it sits under /node_modules/. */
  library: boolean;
}

/**
 * A bundle tab's text as the worker aligns it. `key` names one version of it (tab id and model version);
 * `text` is sent only after the worker answers `need-view`, once per version.
 */
export interface ViewRef {
  key: string;
  text?: string;
}

export type MissReason =
  | 'unloaded'
  | 'need-view'
  | 'no-bundle'
  | 'unknown-source'
  | 'no-content'
  | 'unmapped'
  | 'edited'
  | 'no-code-near'
  | 'outside-bundle';

export interface Miss {
  miss: MissReason;
}

/** `detail`: invalid → the parser's or shape message; too-large → megabytes; others ''. */
export type SourceMapParseFailure = 'invalid-data-url' | 'too-large' | 'not-a-map' | 'invalid' | 'unsupported-sections';

/** How a bundle position landed in the tab: exactly, or where the user's edits (or a new build) start. */
export type AlignmentFit = 'exact' | 'edited';

export type SourceMapWorkerRequest =
  | { type: 'load'; bundleUrl: string; mapUrl: string | null; bundle: string | null; map: SourceMapBody }
  | { type: 'content'; bundleUrl: string; url: string }
  /** `offset`: 0-based UTF-16 offset into the bundle tab's text. */
  | { type: 'toOriginal'; bundleUrl: string; view: ViewRef; offset: number }
  /** `line`: 1-based line of the original (its editor line). */
  | { type: 'toBundle'; bundleUrl: string; url: string; line: number }
  /** `rawOffset`: from `toBundle`. */
  | { type: 'toView'; bundleUrl: string; view: ViewRef; rawOffset: number };

export interface SourceMapWorkerReplies {
  load: { ok: true; sources: OriginalSource[] } | { ok: false; failure: SourceMapParseFailure; detail: string };
  content: { content: string } | Miss;
  /** Editor-style: 1-based line and column. */
  toOriginal: { url: string; line: number; column: number; mismatch: boolean } | Miss;
  /** `rawOffset`: 0-based UTF-16 offset into the raw bundle; `line`: the original line actually used (after probing). */
  toBundle: { rawOffset: number; line: number; mismatch: boolean } | Miss;
  /** `offset`: 0-based UTF-16 offset into the view's text; for `edited`, where the edits start. */
  toView: { offset: number; fit: AlignmentFit } | Miss;
}

export type SourceMapRequestType = SourceMapWorkerRequest['type'];
export type SourceMapRequestOf<T extends SourceMapRequestType> = Extract<SourceMapWorkerRequest, { type: T }>;

export interface WorkerMessage {
  id: number;
  request: SourceMapWorkerRequest;
}

export type WorkerReply = { id: number; reply: SourceMapWorkerReplies[SourceMapRequestType] } | { id: number; error: string };
