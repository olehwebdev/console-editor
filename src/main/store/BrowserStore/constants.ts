/** The browsers file's version: a newer one is read as empty rather than misread. */
export const BROWSERS_FILE_VERSION = 1;

/** At most this many added browsers, and hidden ids, are kept. */
export const MAX_ADDED_BROWSERS = 20;
export const MAX_HIDDEN_BROWSERS = 200;

/** The longest name, path and id kept. */
export const MAX_BROWSER_TEXT = 1024;

/** An added browser's id. */
export const ADDED_BROWSER_ID = /^added:[0-9a-f]{8}$/;
