import { toHeaders } from '../toHeaders';
import type { NetworkLogContext, SocketEvent } from '../types';

/** `Network.webSocketHandshakeResponseReceived`: the server's answer (101 once it switched protocols) and its headers. */
export function socketAccepted({ log, batch }: NetworkLogContext, p: SocketEvent, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry) return;
  entry.row.status = p.response?.status ?? 0;
  entry.statusText = p.response?.statusText ?? '';
  entry.responseHeaders = toHeaders(p.response?.headers);
  batch.changed(entry.row.id);
}
