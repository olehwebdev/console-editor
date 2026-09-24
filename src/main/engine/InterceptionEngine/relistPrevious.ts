import type { ResourceTracker } from './ResourceTracker';
import type { WorkerScripts } from './WorkerScripts';

/** A service worker attached again lists what it loaded before: its installed scripts aren't fetched again. */
export function relistPrevious(resources: ResourceTracker, worker: WorkerScripts): void {
  for (const script of worker.info.previous?.scripts ?? []) {
    if (script.url === worker.url) worker.markListed();
    // Its body is gone with the old session: reading it falls back to the out-of-page fetch.
    resources.add({ entry: { ...script, ...worker.label() }, requestId: '' });
  }
}
