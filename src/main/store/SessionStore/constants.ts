export const VERSION = 2;
export const MAX_WORKSPACES = 50;
export const SESSION_FILE = 'session.json';
export const DRAFTS_DIR = 'drafts';
export const FAVICONS_DIR = 'favicons';
/** A tab's draft file, and the file of the text its editing started from. */
export const DRAFT_SUFFIX = { content: '.txt', base: '.base.txt' } as const;
/** A workspace's favicon file: `<workspace id>.txt`. */
export const FAVICON_SUFFIX = '.txt';
