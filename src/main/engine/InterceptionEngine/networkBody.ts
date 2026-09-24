import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { decodeBody } from '../transform';

/** A response body as the page received it, read by network request id. */
export async function networkBody(cdp: CdpTransport, requestId: string, mimeType?: string): Promise<string> {
  const r = await cdp.send<{ body: string; base64Encoded: boolean }>(CDP.Network.getResponseBody, { requestId });
  return decodeBody(r.body, r.base64Encoded, mimeType);
}
