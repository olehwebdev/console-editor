import { useEffect, useEffectEvent, useState } from 'react';
import type { NetworkRequest } from '@common/types';
import { errorMessage } from '@/shared/api';
import type { RequestRead } from './types';

/**
 * What `read` gives for the selected request, or why it failed; null while it is read. It reads again when the
 * request's state changes (its end brings the response), and, if `whenEnded`, not before the request has ended.
 */
export function useRequestRead<T>(request: Pick<NetworkRequest, 'id' | 'state'>, read: (id: string) => Promise<T>, whenEnded = false): RequestRead<T> | null {
  const { id, state } = request;
  const [result, setResult] = useState<RequestRead<T> | null>(null);
  const readRequest = useEffectEvent(read);
  const waiting = whenEnded && state === 'pending';

  // Reads it through the main process, and drops the answer if another request was selected meanwhile.
  useEffect(() => {
    if (waiting) return;
    let current = true;
    readRequest(id).then(
      (value) => current && setResult({ id, value }),
      (err: unknown) => current && setResult({ id, error: errorMessage(err) }),
    );
    return () => {
      current = false;
    };
  }, [id, state, waiting]);

  // Another request's, until this one's arrive.
  return result?.id === id ? result : null;
}
