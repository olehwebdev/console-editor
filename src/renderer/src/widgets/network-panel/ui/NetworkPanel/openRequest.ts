import type { NetworkRequest } from '@common/types';
import { locateLocations } from '@/features/open-resource';
import { useNetworkSelection } from '../../model';

/** Shows a request's details, tracing the script that sent it (its Sent by stack) to the originals. */
export function openRequest(request: NetworkRequest): void {
  useNetworkSelection.getState().select(request.id);
  if (request.initiator) void locateLocations(request.initiator);
}
