import { useEffect, useState } from 'react';
import type { NetworkRequest, NetworkRequestDetail } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { responseText } from '@/features/open-resource';

/** A request's details as read, or why they couldn't be; tagged with the request they are for. */
type DetailResult = { id: string; detail?: NetworkRequestDetail; error?: string };

/** The selected request's headers and body (pretty-printed when JSON), or null while they are read. */
export function useRequestDetail(request: Pick<NetworkRequest, 'id' | 'state'>): DetailResult | null {
  const { id, state } = request;
  const [result, setResult] = useState<DetailResult | null>(null);

  // Reads them from the main process's log; again once the request ends, which brings the response's headers.
  useEffect(() => {
    let current = true;
    api
      .getNetworkRequest(id)
      .then(async (detail) => ({ ...detail, body: detail.body === undefined ? undefined : await responseText(detail.body, true) }))
      .then(
        (detail) => current && setResult({ id, detail }),
        (err: unknown) => current && setResult({ id, error: errorMessage(err) }),
      );
    return () => {
      current = false;
    };
  }, [id, state]);

  // Another request's, until this one's arrive.
  return result?.id === id ? result : null;
}
