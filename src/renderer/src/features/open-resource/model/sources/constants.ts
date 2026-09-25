import type { SourceMapKind } from '@common/types';

/** Starts the in-flight key of an original being opened, so it never equals a URL or override id in `opening`. */
export const SOURCE_OPEN_KEY_PREFIX = 'source:';
/** Joins a tab id, model and version into the key of one version of a tab's text. */
export const VIEW_KEY_SEPARATOR = ':';
/** Stands for "the map the renderer holds still matches" in a load's result. */
export const UNCHANGED = Symbol('unchanged');
/** Where V8 places functions: in scripts, whose maps are looked up for a picked component. */
export const SCRIPT_KIND: SourceMapKind = 'Script';

/** How long originals found are gathered before they are written, in one update (a frame). */
export const ORIGIN_FLUSH_MS = 16;
