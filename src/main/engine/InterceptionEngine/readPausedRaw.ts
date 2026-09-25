import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import type { RawBody } from '../transform';
import type { RequestPausedParams } from './types';

/** The paused response's body as CDP returns it (undecoded), or undefined when it can't be read. */
export async function readPausedRaw(cdp: CdpTransport, p: RequestPausedParams): Promise<RawBody | undefined> {
  try {
    return await cdp.send<RawBody>(CDP.Fetch.getResponseBody, { requestId: p.requestId });
  } catch {
    return undefined;
  }
}
