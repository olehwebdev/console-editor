/*
 * Session restore: the open tabs, and the unsaved text of each (a "draft"),
 * are written to disk as they change, and reopened on the next start. The
 * page URL is remembered by the main process itself.
 */
export { flushSession } from './flushSession';
export { restoreSession } from './restoreSession';
export { startSessionSync } from './startSessionSync';
