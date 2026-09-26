import type { NetworkBody, NetworkRequest } from '@common/types';
import { api } from '@/shared/api';
import { responseText } from '@/shared/lib';
import type { RequestRead } from './types';
import { useRequestRead } from './useRequestRead';

/**
 * The selected request's response body (JSON pretty-printed) once it has finished arriving, or null while it is
 * read (or awaited): from the page's browser session, through the main process.
 */
export function useResponseBody(request: Pick<NetworkRequest, 'id' | 'state'>): RequestRead<NetworkBody> | null {
  return useRequestRead(
    request,
    async (id): Promise<NetworkBody> => {
      const body = await api.getNetworkResponseBody(id);
      return body.available && !body.binary ? { ...body, text: await responseText(body.text, true) } : body;
    },
    true,
  );
}
