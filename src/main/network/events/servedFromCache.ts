import type { NetworkLogContext } from '../types';

/** `Network.requestServedFromCache`: the HTTP cache answered, so it never reached the network. */
export function servedFromCache({ log, batch }: NetworkLogContext, p: { requestId: string }, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry) return;
  entry.row.fromCache = true;
  batch.changed(entry.row.id);
}
