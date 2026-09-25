import { CDP } from '../constants';
import type { CdpTransport } from '../cdp';
import type { ResponseHead } from '../rules';
import { withUtf8ContentType } from '../transform';

/** Answers a held request with the status, headers and text the user sent. */
export async function fulfillHeld(cdp: CdpTransport, requestId: string, head: ResponseHead, body: string): Promise<void> {
  await cdp.send(CDP.Fetch.fulfillRequest, {
    requestId,
    responseCode: head.status,
    responseHeaders: withUtf8ContentType(head.headers),
    body: Buffer.from(body, 'utf8').toString('base64'),
  });
}
