import { useEffect, useState } from 'react';
import type { NetworkBody, NetworkRequest } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { responseText } from '@/features/open-resource';

/** A response's body as read (JSON pretty-printed), or why it couldn't be; tagged with its request. */
type BodyResult = { id: string; body?: NetworkBody; error?: string };

/** The selected request's response body once it has finished arriving, or null while it is read (or awaited). */
export function useResponseBody(request: Pick<NetworkRequest, 'id' | 'state'>): BodyResult | null {
  const { id, state } = request;
  const [result, setResult] = useState<BodyResult | null>(null);

  // Reads it from the page's browser session, through the main process, once there is all of it.
  useEffect(() => {
    if (state === 'pending') return;
    let current = true;
    api
      .getNetworkResponseBody(id)
      .then(async (body): Promise<NetworkBody> => (body.available && !body.binary ? { ...body, text: await responseText(body.text, true) } : body))
      .then(
        (body) => current && setResult({ id, body }),
        (err: unknown) => current && setResult({ id, error: errorMessage(err) }),
      );
    return () => {
      current = false;
    };
  }, [id, state]);

  return result?.id === id ? result : null;
}
