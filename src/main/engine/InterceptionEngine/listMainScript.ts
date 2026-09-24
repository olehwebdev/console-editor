import type { ResourceEntry } from '../../../shared/types';
import { defaultContentType } from '../transform';
import { OTHER_RESOURCE_TYPE, SCRIPT_KIND, STARTED_SCRIPT_STATUS, UNLISTED_URL } from './constants';
import type { ResourceTracker } from './ResourceTracker';
import type { WorkerScripts } from './WorkerScripts';

/**
 * Lists a worker's first script without a `responseReceived`. `fetched`: it
 * came over the network on the worker's session (so an enabled override should
 * have served it), rather than from installed scripts or its page.
 */
export function listMainScript(resources: ResourceTracker, worker: WorkerScripts, fetched: boolean): void {
  worker.markListed();
  const url = worker.url;
  const overrideId = resources.takeServed(worker.info.targetId);
  if (UNLISTED_URL.test(url)) return;
  if (fetched && !overrideId) resources.reportMissed(url, OTHER_RESOURCE_TYPE, worker.missedReason(url, true));
  const entry: ResourceEntry = {
    url,
    kind: SCRIPT_KIND,
    mimeType: defaultContentType(SCRIPT_KIND),
    status: STARTED_SCRIPT_STATUS,
    ...(overrideId ? { overrideId } : {}),
    ...worker.label(),
  };
  resources.add({ entry, requestId: worker.info.targetId });
}
