import { toHeaders } from '../toHeaders';
import type { ExtraInfo, NetworkLogContext } from '../types';

/** `Network.responseReceivedExtraInfo`: the response's headers as they arrived, `Set-Cookie` included. */
export function responseExtraInfo({ log }: NetworkLogContext, p: ExtraInfo, sessionId: string | undefined): void {
  const entry = log.find(sessionId, p.requestId);
  if (entry) entry.wireResponseHeaders = toHeaders(p.headers);
}
