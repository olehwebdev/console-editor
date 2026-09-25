/** A decoded map can take hundreds of MB in the worker: it is shut down once idle this long. */
export const IDLE_SHUTDOWN_MS = 180_000;
/** Maps the worker keeps decoded; the least recently used go first (the store keeps their file lists). */
export const MAX_RESIDENT_MAPS = 4;
/** …and the map bytes they may add up to (roughly ten times that once decoded). */
export const MAX_RESIDENT_MAP_BYTES = 48 * 1024 * 1024;
/** The largest map a data: URL may decode to. */
export const MAX_MAP_BYTES = 64 * 1024 * 1024;
export const BYTES_PER_MB = 1024 * 1024;
/** How far from an original line without code a jump looks for one, each way. */
export const MAX_LINE_PROBE = 200;
/** Index maps nest; deeper nesting than this isn't a real build. */
export const MAX_SECTION_DEPTH = 4;
/** A map counts as not matching its bundle when more of its positions than this fall outside it… */
export const MISMATCH_RATIO = 0.01;
/** …and at least this many (a few stray segments are tolerated). */
export const MISMATCH_MIN_SEGMENTS = 10;
/** What some servers put before JSON so it can't be run as a script; maps may start with it. */
export const XSSI_PREFIX = ")]}'";
/** A map URL answered with a page (an app's fallback route): its first character. */
export const HTML_START = '<';
export const BASE64_SUFFIX = ';base64';
export const NODE_MODULES_SEGMENT = '/node_modules/';
export const LINE_FEED = 0x0a;
/**
 * The characters lining up ignores: JavaScript's `\s`, plus U+180E, which js-beautify's tokenizer
 * also drops. The app's pretty-printing only ever changes these.
 */
export const WHITESPACE_CODES: ReadonlySet<number> = new Set([
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x180e, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009,
  0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
]);
