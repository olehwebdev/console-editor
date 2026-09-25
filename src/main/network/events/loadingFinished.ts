import { durationMs } from '../durationMs';
import type { LoadingEnded, NetworkLogContext } from '../types';

/** `Network.loadingFinished`: its last byte arrived; the row gets its size and how long it took. */
export function loadingFinished({ log, batch }: NetworkLogContext, p: LoadingEnded, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry) return;
  Object.assign(entry.row, { state: 'done', duration: durationMs(entry.sentAt, p.timestamp), ...(p.encodedDataLength !== undefined ? { size: p.encodedDataLength } : {}) });
  batch.changed(entry.row.id);
}
