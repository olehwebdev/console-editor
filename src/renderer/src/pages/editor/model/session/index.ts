/*
 * Session restore: the active workspace's open tabs, and the unsaved text of
 * each (a "draft"), are written to disk as they change, and reopened on the
 * next start or when the workspace is switched back to. The page URL is
 * remembered by the main process itself.
 */
export { closeSessionTabs } from './closeSessionTabs';
export { flushSession } from './flushSession';
export { pageSession } from './pageSession';
export { restoreSession } from './restoreSession';
export { sessionPending } from './sessionPending';
export { startSessionSync } from './startSessionSync';
export type { PageSession } from './types';
