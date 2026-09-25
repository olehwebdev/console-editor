/** A loading page adds files every frame, and each new list re-ranks the whole palette. */
export const FILES_REFRESH_MS = 300;

/** At most this many originals are offered: the palette ranks every item on each keystroke. */
export const PALETTE_SOURCE_LIMIT = 20_000;

/** Starts an original's item id, so it never equals a page file's (a URL). */
export const SOURCE_ITEM_PREFIX = 'source:';
