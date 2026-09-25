import { useEffect, useState } from 'react';
import { MAX_SOCKET_MESSAGES } from '@common/constants';
import type { NetworkRequest, SocketMessage } from '@common/types';
import { api, errorMessage } from '@/shared/api';

/** A socket's messages read so far: `next` is the number of the one after the last. */
export interface SocketMessagesRead {
  id: string;
  next: number;
  list: SocketMessage[];
  error?: string;
}

/** The selected socket's messages, read as they come (only the new ones each time), or null while the first read runs. */
export function useSocketMessages(request: Pick<NetworkRequest, 'id' | 'messages'>): SocketMessagesRead | null {
  const { id, messages = 0 } = request;
  const [read, setRead] = useState<SocketMessagesRead | null>(null);
  const current = read?.id === id ? read : null;
  const next = current?.next ?? 0;
  const started = current !== null;

  // Reads the messages that came since the last read from the main process's log (the row counts them).
  useEffect(() => {
    if (started && messages <= next) return;
    let live = true;
    api.getNetworkMessages(id, next).then(
      ({ first, messages: got }) => {
        if (!live) return;
        setRead((prev) => ({ id, next: first + got.length, list: [...(prev?.id === id ? prev.list : []), ...got].slice(-MAX_SOCKET_MESSAGES) }));
      },
      (err: unknown) => live && setRead({ id, next, list: [], error: errorMessage(err) }),
    );
    return () => {
      live = false;
    };
  }, [id, messages, next, started]);

  return current;
}
