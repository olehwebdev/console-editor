import type { HeldAction } from '../../../shared/types';
import { CDP } from '../constants';
import { applyHeaderEdits } from '../rules';
import { headerEntries } from '../transform';
import type { HeldActionApplier } from './types';

/**
 * Request stage: sends the held request with the user's method, URL, header changes (on its own
 * headers) and body. Its response can still stop at a response breakpoint, or be overridden.
 */
export const sendEdited: HeldActionApplier<Extract<HeldAction, { type: 'send' }>> = async ({ cdp }, p, { url, method, headers, body }) => {
  await cdp.send(CDP.Fetch.continueRequest, {
    requestId: p.requestId,
    url,
    method,
    headers: applyHeaderEdits(headerEntries(p.request.headers), headers),
    ...(body !== undefined ? { postData: Buffer.from(body, 'utf8').toString('base64') } : {}),
  });
  return true;
};
