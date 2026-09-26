import type { Settings } from '../../../shared/types';
import { NETWORK_CONDITIONS } from '../../../shared/throttling';
import { CDP } from '../constants';
import type { CdpCommand } from './types';

/** The network settings a dedicated or shared worker's session takes, as the page's: its cache, service workers and throttling. */
export function workerNetworkSettings(s: Settings): CdpCommand[] {
  return [
    [CDP.Network.setCacheDisabled, { cacheDisabled: s.disableCache }],
    [CDP.Network.setBypassServiceWorker, { bypass: s.bypassServiceWorker }],
    [CDP.Network.emulateNetworkConditions, { ...NETWORK_CONDITIONS[s.throttling] }],
  ];
}
