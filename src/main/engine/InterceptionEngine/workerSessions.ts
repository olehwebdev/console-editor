import type { WorkerType } from '../../../shared/types';
import { CDP } from '../constants';
import type { WorkerSession } from './types';

/** What each kind of worker's session offers and takes: a new kind fails typecheck until it's here. */
export const WORKER_SESSIONS: Record<WorkerType, WorkerSession> = {
  worker: {
    fetch: false,
    pausesScripts: false,
    settings: (s) => [
      [CDP.Network.setCacheDisabled, { cacheDisabled: s.disableCache }],
      [CDP.Network.setBypassServiceWorker, { bypass: s.bypassServiceWorker }],
    ],
  },
  shared_worker: {
    fetch: true,
    pausesScripts: true,
    settings: (s) => [
      [CDP.Network.setCacheDisabled, { cacheDisabled: s.disableCache }],
      [CDP.Network.setBypassServiceWorker, { bypass: s.bypassServiceWorker }],
    ],
  },
  service_worker: {
    fetch: true,
    pausesScripts: true,
    settings: (s) => [[CDP.Network.setCacheDisabled, { cacheDisabled: s.disableCache }]],
  },
  worklet: {
    fetch: false,
    pausesScripts: false,
    settings: () => [],
  },
};
