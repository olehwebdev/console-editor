import type { WorkerType } from '../../../shared/types';
import { NETWORK_CONDITIONS } from '../../../shared/throttling';
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
      [CDP.Network.emulateNetworkConditions, { ...NETWORK_CONDITIONS[s.throttling] }],
    ],
  },
  shared_worker: {
    fetch: true,
    pausesScripts: true,
    settings: (s) => [
      [CDP.Network.setCacheDisabled, { cacheDisabled: s.disableCache }],
      [CDP.Network.setBypassServiceWorker, { bypass: s.bypassServiceWorker }],
      [CDP.Network.emulateNetworkConditions, { ...NETWORK_CONDITIONS[s.throttling] }],
    ],
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
