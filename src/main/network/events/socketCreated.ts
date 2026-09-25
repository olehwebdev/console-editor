import { SOCKET_TYPE } from '../../../shared/constants';
import type { NetworkLogContext, SocketEvent } from '../types';

/** `Network.webSocketCreated`: a new row for the socket, pending until it closes. Its time comes with its handshake. */
export function socketCreated({ log, batch, page, workers }: NetworkLogContext, p: SocketEvent, sessionId: string | undefined): void {
  const worker = sessionId === undefined ? undefined : workers.get(sessionId);
  const entry = log.add({
    sessionId,
    requestId: p.requestId,
    sentAt: 0,
    requestHeaders: [],
    responseHeaders: [],
    statusText: '',
    messages: [],
    row: {
      url: p.url ?? '',
      method: 'GET',
      type: SOCKET_TYPE,
      state: 'pending',
      status: 0,
      mimeType: '',
      startedAt: Date.now(),
      ...(worker ? { worker: { ...worker } } : {}),
      hasBody: false,
      messages: 0,
      pageLoad: page.load,
    },
  });
  batch.changed(entry.row.id);
}
