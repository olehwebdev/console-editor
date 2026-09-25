import { toHeaders } from '../toHeaders';
import type { ExtraInfo, NetworkLogContext } from '../types';

/** `Network.requestWillBeSentExtraInfo`: the request's headers as they went out, cookies included. */
export function requestExtraInfo({ log }: NetworkLogContext, p: ExtraInfo, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (entry) entry.wireRequestHeaders = toHeaders(p.headers);
}
