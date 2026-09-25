import type { NetworkRequest } from '@common/types';
import { useInspectorStore } from '@/entities/inspector';
import { receiveRequests } from '@/features/network/filter';
import { locateFrameRequests } from '@/features/open-resource';

/**
 * Requests new to the log or changed: they join it, and those of the frame the Component page shows have the
 * scripts that sent them traced to the originals (its Requests section lists those sent from its file). Other
 * requests' scripts are traced when one is opened, not as they arrive: a busy site sends thousands.
 */
export function receiveNetworkRequests(requests: readonly NetworkRequest[], replace = false): void {
  receiveRequests(requests, replace);
  void locateFrameRequests(useInspectorStore.getState().component?.frameId, requests);
}
