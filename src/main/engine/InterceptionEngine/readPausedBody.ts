import type { CdpTransport } from '../cdp';
import { CDP, CONTENT_TYPE } from '../constants';
import { decodeBody, headerValue } from '../transform';
import type { RequestPausedParams } from './types';

/** The upstream body of a paused response, or undefined when Chromium can't return it. */
export async function readPausedBody(cdp: CdpTransport, p: RequestPausedParams): Promise<string | undefined> {
  try {
    const r = await cdp.send<{ body: string; base64Encoded: boolean }>(CDP.Fetch.getResponseBody, {
      requestId: p.requestId,
    });
    return decodeBody(r.body, r.base64Encoded, headerValue(p.responseHeaders, CONTENT_TYPE));
  } catch {
    return undefined;
  }
}
