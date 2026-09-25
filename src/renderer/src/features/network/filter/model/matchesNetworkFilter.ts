import type { NetworkRequest } from '@common/types';
import { requestGroup } from '@/entities/network-request';
import type { NetworkFilter } from './types';

/** Whether a row shows under the filter: in its group, and its URL (or GraphQL operation) containing the text. */
export function matchesNetworkFilter(request: NetworkRequest, { group, text }: Pick<NetworkFilter, 'group' | 'text'>): boolean {
  if (group !== 'all' && requestGroup(request) !== group) return false;
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return request.url.toLowerCase().includes(needle) || !!request.operation?.toLowerCase().includes(needle);
}
