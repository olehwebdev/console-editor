import { CDP } from '../constants';
import { applyCors, type PausedRequest } from '../rules';
import { PREFLIGHT_STATUS } from '../rules/constants';
import type { CdpTransport } from '../cdp';

/**
 * Answers a CORS preflight for a request an override will answer without sending it: allowed for the
 * page's origin, with the method and headers it asks for, so the real request goes ahead (to be
 * answered), even while the server is down or refuses preflights.
 */
export async function answerPreflight(cdp: CdpTransport, requestId: string, request: PausedRequest): Promise<void> {
  const { status, headers } = applyCors({ status: PREFLIGHT_STATUS, headers: [] }, request);
  await cdp.send(CDP.Fetch.fulfillRequest, { requestId, responseCode: status, responseHeaders: headers, body: '' });
}
