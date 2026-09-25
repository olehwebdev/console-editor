import type { NetworkRequest } from '@common/types';
import { useNetworkStore } from '@/entities/network-request';
import { locateLocations } from './locateLocations';

/**
 * Traces the scripts that sent a frame's requests (the Component page shown lists those sent from its file):
 * the requests logged, or `requests` when given (new ones as they arrive). Only that frame's: the other
 * requests' scripts are traced when one is opened in the Network panel.
 */
export function locateFrameRequests(frameId: string | null | undefined, requests: readonly NetworkRequest[] = useNetworkStore.getState().requests): Promise<void> {
  if (!frameId) return Promise.resolve();
  return locateLocations(requests.flatMap((request) => (request.frameId === frameId ? (request.initiator ?? []) : [])));
}
