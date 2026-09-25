import type { Breakpoint, BreakpointStage, HeldResponse } from '../../../shared/types';
import { CONTENT_TYPE } from '../constants';
import { headerEntries, headerValue } from '../transform';
import { TEXT_BODY } from './constants';
import { readPausedBody } from './readPausedBody';
import type { HoldInput, PausedRequestContext, RequestPausedParams } from './types';

/** What a held request shows: the request as it was to be sent, and at the response stage its response (a text body read in full). */
export async function heldInputOf(ctx: PausedRequestContext, p: RequestPausedParams, breakpoint: Breakpoint, stage: BreakpointStage): Promise<HoldInput> {
  const { url, method, headers, postData } = p.request;
  const input: HoldInput = {
    breakpointId: breakpoint.id,
    stage,
    url,
    method,
    requestHeaders: headerEntries(headers),
    ...(postData !== undefined ? { requestBody: postData } : {}),
    ...(p.networkId ? { networkId: p.networkId } : {}),
  };
  if (stage === 'request') return input;
  const text = TEXT_BODY.test(headerValue(p.responseHeaders, CONTENT_TYPE) ?? '');
  const body = text ? await readPausedBody(ctx.cdp, p) : undefined;
  const response: HeldResponse = { status: p.responseStatusCode ?? 0, statusText: p.responseStatusText ?? '', headers: p.responseHeaders ?? [], ...(body !== undefined ? { body } : {}) };
  return { ...input, response };
}
