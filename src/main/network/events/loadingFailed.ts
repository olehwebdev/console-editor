import { durationMs } from '../durationMs';
import { failureOf } from '../failureOf';
import type { LoadingEnded, NetworkLogContext } from '../types';

/** `Network.loadingFailed`: blocked, cancelled (the page gave up, or navigated) or a network error. */
export function loadingFailed({ log, batch }: NetworkLogContext, p: LoadingEnded, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry) return;
  Object.assign(entry.row, { state: 'failed', error: failureOf(p), duration: durationMs(entry.sentAt, p.timestamp) });
  batch.changed(entry.row.id);
}
