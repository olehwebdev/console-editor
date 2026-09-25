import { durationMs } from '../durationMs';
import type { NetworkLogContext, SocketEvent } from '../types';

/** `Network.webSocketClosed`: done (unless it broke first), with how long it was open. */
export function socketClosed({ log, batch }: NetworkLogContext, p: SocketEvent, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry) return;
  if (entry.row.state === 'pending') entry.row.state = 'done';
  if (entry.sentAt && p.timestamp !== undefined) entry.row.duration = durationMs(entry.sentAt, p.timestamp);
  batch.changed(entry.row.id);
}
