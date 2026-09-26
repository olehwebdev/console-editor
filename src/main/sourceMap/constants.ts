import type { SourceMapKind } from '../../shared/types';
import type { SourceMapLimits, SourceMapVia } from './types';

export const BYTES_PER_MB = 1024 * 1024;
export const MS_PER_SECOND = 1000;

export const SOURCE_MAP_LIMITS: SourceMapLimits = {
  // The engine's per-resource CDP buffer: maps are rarely larger than the bundles they describe.
  maxMapBytes: 64 * BYTES_PER_MB,
  maxInlineChars: 64 * BYTES_PER_MB,
  // With a 64 MB map, one reply stays under Chromium's 128 MB IPC message limit.
  maxBundleChars: 16 * BYTES_PER_MB,
  timeoutMs: 30 * MS_PER_SECOND,
};

/**
 * Which reference wins when a file names a map both ways, as Chromium decides: a script's header
 * (ECMA-426, V8), a stylesheet's comment (Blink's inspector). The loser isn't tried if the winner fails.
 */
export const MAP_REFERENCE_PRECEDENCE: Record<SourceMapKind, readonly SourceMapVia[]> = {
  Script: ['header', 'comment'],
  Stylesheet: ['comment', 'header'],
};

/** The only schemes a page-chosen map URL is fetched from (through the site's session). */
export const REMOTE_MAP_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/** An inline map: handed to the renderer undecoded, never parsed here. */
export const DATA_URL = /^data:/i;

/** DOMException names of an aborted fetch (AbortSignal.timeout aborts with a TimeoutError). */
export const TIMEOUT_ERRORS: ReadonlySet<string> = new Set(['TimeoutError', 'AbortError']);

export const CONTENT_LENGTH = 'content-length';
export const CONTENT_ENCODING = 'content-encoding';

/** How much of an invalid reference an error quotes. */
export const MAX_SHOWN_REFERENCE = 200;

/** What the file dialog of **Load a source map…** offers. */
export const MAP_FILE_FILTERS = [
  { name: 'Source maps', extensions: ['map', 'json'] },
  { name: 'All files', extensions: ['*'] },
];
