import type { NetworkRequest } from '@common/types';
import { useNetworkStore } from '@/entities/network-request';
import { useNetworkFilter } from './useNetworkFilter';

/**
 * Adds and updates rows from the main process. When the top page loads another page, the rows of the
 * earlier loads go, as in DevTools, unless Keep rows is on. With `replace`, the rows are the whole log
 * (a start's snapshot).
 */
export function receiveRequests(requests: readonly NetworkRequest[], replace = false): void {
  const store = useNetworkStore.getState();
  if (replace) store.setAll(requests);
  else store.upsert(requests);
  if (useNetworkFilter.getState().keepRows) return;
  const latest = useNetworkStore.getState().requests.reduce((max, r) => Math.max(max, r.pageLoad), 0);
  store.dropBefore(latest);
}
