import { toHeaders } from '../toHeaders';
import type { NetworkLogContext, ResponseReceived } from '../types';

/** `Network.responseReceived`: the row gets its status, type (a preflight's is only told now) and where it came from. */
export function responseReceived({ log, batch }: NetworkLogContext, p: ResponseReceived, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (!entry) return;
  const { status, mimeType, headers, statusText, fromServiceWorker, fromDiskCache, fromPrefetchCache } = p.response;
  Object.assign(entry.row, {
    status,
    mimeType,
    ...(p.type ? { type: p.type } : {}),
    ...(fromServiceWorker ? { fromServiceWorker: true } : {}),
    ...(fromDiskCache || fromPrefetchCache ? { fromCache: true } : {}),
  });
  Object.assign(entry, { responseHeaders: toHeaders(headers), statusText: statusText ?? '' });
  batch.changed(entry.row.id);
}
