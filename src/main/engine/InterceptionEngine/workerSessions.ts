import type { WorkerType } from '../../../shared/types';
import { NETWORK_CONDITIONS } from '../../../shared/throttling';
import { CDP } from '../constants';
import type { WorkerSession } from './types';
import { workerNetworkSettings } from './workerNetworkSettings';

/** What each kind of worker's session offers and takes: a new kind fails typecheck until it's here. */
export const WORKER_SESSIONS: Record<WorkerType, WorkerSession> = {
  worker: {
    fetch: false,
    pausesScripts: false,
    settings: workerNetworkSettings,
  },
  shared_worker: {
    fetch: true,
    pausesScripts: true,
    settings: workerNetworkSettings,
  },
  service_worker: {
    fetch: true,
    pausesScripts: true,
    settings: (s) => [
      [CDP.Network.setCacheDisabled, { cacheDisabled: s.disableCache }],
      [CDP.Network.emulateNetworkConditions, { ...NETWORK_CONDITIONS[s.throttling] }],
    ],
  },
  worklet: {
    fetch: false,
    pausesScripts: false,
    settings: () => [],
  },
};
