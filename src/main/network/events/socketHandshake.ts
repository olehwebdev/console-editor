import { MS_PER_SECOND } from '../constants';
import { toHeaders } from '../toHeaders';
import type { NetworkLogContext, SocketEvent } from '../types';

/** `Network.webSocketWillSendHandshakeRequest`: when the socket started, and the headers it asked with. */
export function socketHandshake({ log, batch }: NetworkLogContext, p: SocketEvent, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry) return;
  entry.sentAt = p.timestamp ?? entry.sentAt;
  entry.requestHeaders = toHeaders(p.request?.headers);
  if (p.wallTime !== undefined) entry.row.startedAt = Math.round(p.wallTime * MS_PER_SECOND);
  batch.changed(entry.row.id);
}
