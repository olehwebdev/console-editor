import type { CdpTransport } from '../cdp';
import { CDP, TARGET_TYPE } from '../constants';
import { listMainScript } from './listMainScript';
import type { ResourceTracker } from './ResourceTracker';
import type { RequestWillBeSentParams } from './types';
import type { WorkerScripts } from './WorkerScripts';

/** Follows how a worker session gets the worker's own first script. Returns the unsubscribers. */
export function watchWorker(cdp: CdpTransport, resources: ResourceTracker, worker: WorkerScripts): Array<() => void> {
  return [
    cdp.on(CDP.Network.requestWillBeSent, (p: RequestWillBeSentParams) => worker.requested(p)),
    // Fetched on this session without a `responseReceived` (a service worker's).
    cdp.on(CDP.Network.loadingFinished, (p: { requestId: string }) => {
      if (p.requestId === worker.info.targetId && !worker.mainScriptListed) listMainScript(resources, worker, true);
    }),
    // Started from installed scripts (a service worker) or a script its page fetched (a shared worker).
    // (A worklet's target URL is its document's, not a script.)
    cdp.on(CDP.Inspector.workerScriptLoaded, () => {
      if (worker.mainScriptUnseen && worker.type !== TARGET_TYPE.worklet) listMainScript(resources, worker, false);
    }),
  ];
}
