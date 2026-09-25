import type { NetworkRequest } from '@common/types';
import { locateLocations } from '@/features/open-resource';
import { receiveRequests } from '@/features/network/filter';

/**
 * Requests new to the log or changed: they join it, and the calls of the scripts that sent them are traced
 * to the originals (a Component page lists the requests sent from its file).
 */
export function receiveNetworkRequests(requests: readonly NetworkRequest[], replace = false): void {
  receiveRequests(requests, replace);
  void locateLocations(requests.flatMap((request) => request.initiator ?? []));
}
