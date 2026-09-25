import type { NetworkLogContext, SocketEvent } from '../types';

/** `Network.webSocketFrameError`: the socket broke; its row says why. */
export function socketError({ log, batch }: NetworkLogContext, p: SocketEvent, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry) return;
  Object.assign(entry.row, { state: 'failed', ...(p.errorMessage ? { error: p.errorMessage } : {}) });
  batch.changed(entry.row.id);
}
