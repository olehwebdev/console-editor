import type { NetworkRequest, NetworkRequestDetail } from '@common/types';
import { api } from '@/shared/api';
import { responseText } from '@/shared/lib';
import type { RequestRead } from './types';
import { useRequestRead } from './useRequestRead';

/**
 * The selected request's headers and body (pretty-printed when JSON), or null while they are read: from the main
 * process's log, and again once the request ends, which brings the response's headers.
 */
export function useRequestDetail(request: Pick<NetworkRequest, 'id' | 'state'>): RequestRead<NetworkRequestDetail> | null {
  return useRequestRead(request, async (id) => {
    const detail = await api.getNetworkRequest(id);
    return { ...detail, body: detail.body === undefined ? undefined : await responseText(detail.body, true) };
  });
}
