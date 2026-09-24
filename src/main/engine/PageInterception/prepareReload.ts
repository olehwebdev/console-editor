import { TARGET_TYPE } from '../constants';
import { outdatedKept } from './outdatedKept';
import type { ChildContext } from './types';
import { unregisterAttached } from './unregisterAttached';
import { unregisterKept } from './unregisterKept';

/**
 * Call before loading `url` (reloading, or navigating) after overrides
 * changed. Chromium keeps a service worker's installed scripts and doesn't
 * fetch them on reload, so a service worker running other code than would be
 * served now is asked to unregister: the page's `register()` then installs it
 * afresh, through interception. (With the page bypassing service workers, the
 * default, nothing else ever fetches them again, and nothing undoes the new
 * install.) That includes one of `url`'s site that went with the page it left
 * (switching workspaces leaves the page first, then changes the overrides).
 */
export async function prepareReload(ctx: ChildContext, url?: string): Promise<void> {
  const outdated = ctx.children.list().filter((c) => c.type === TARGET_TYPE.serviceWorker && !c.retired && c.engine.isOutdated());
  await Promise.all([...outdated.map((child) => unregisterAttached(ctx, child)), ...outdatedKept(ctx, url).map((targetId) => unregisterKept(ctx, targetId))]);
}
