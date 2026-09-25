import type { ResourceEntry } from '../../../shared/types';
import { CONTENT_TYPE } from '../constants';
import { defaultContentType, headerValue } from '../transform';
import { OVERRIDE_STATUS, SCRIPT_KIND, UNLISTED_URL } from './constants';
import type { ResourceTracker } from './ResourceTracker';
import type { RequestPausedParams } from './types';
import type { WorkerScripts } from './WorkerScripts';

/** Lists a script a worker loaded from its pause, unless its session reported it. `overrideId`: the override that served it. */
export function listPausedScript(resources: ResourceTracker, worker: WorkerScripts, p: RequestPausedParams, overrideId?: string): void {
  const url = p.request.url;
  if (worker.isOwnScript(url, p.resourceType)) worker.markListed();
  if (resources.has(url) || UNLISTED_URL.test(url)) return;
  if (!overrideId && (p.responseErrorReason || p.responseStatusCode === undefined)) return;
  const mimeType = headerValue(p.responseHeaders, CONTENT_TYPE)?.split(';')[0].trim();
  const entry: ResourceEntry = {
    url,
    kind: SCRIPT_KIND,
    mimeType: (!overrideId && mimeType) || defaultContentType(SCRIPT_KIND),
    status: overrideId ? OVERRIDE_STATUS : p.responseStatusCode!,
    ...(overrideId ? { overrideId } : {}),
    ...worker.label(),
  };
  resources.add({ entry, requestId: p.networkId ?? p.requestId });
}
