import { GET_METHOD, graphqlOperation } from '../../../shared/overrides';
import { durationMs } from '../durationMs';
import { initiatorFrames } from '../initiatorFrames';
import { MS_PER_SECOND } from '../constants';
import { startsPageLoad } from '../startsPageLoad';
import { toHeaders } from '../toHeaders';
import type { NetworkLogContext, RequestWillBeSent } from '../types';

/** The type a request is listed as until its response says otherwise (a preflight is reported as Other first). */
const UNTYPED = 'Other';

/**
 * `Network.requestWillBeSent`: a new row. A redirect reuses the request id, so the earlier hop's row
 * ends here with the redirect's status, and the id goes on with the new one. The main frame's own
 * navigation starts a new page load first, so its document belongs to it.
 */
export function requestSent(ctx: NetworkLogContext, p: RequestWillBeSent, sessionId: string | undefined): void {
  const { log, batch, page, workers } = ctx;
  const earlier = log.find(sessionId, p.requestId);
  if (earlier && p.redirectResponse) {
    const { status, mimeType, headers, statusText } = p.redirectResponse;
    Object.assign(earlier.row, { status, mimeType, state: 'done', duration: durationMs(earlier.sentAt, p.timestamp) });
    Object.assign(earlier, { responseHeaders: toHeaders(headers), statusText: statusText ?? '' });
    log.release(earlier);
    batch.changed(earlier.row.id);
  }
  if (startsPageLoad(ctx, p, sessionId)) page.load += 1;
  const worker = sessionId === undefined ? undefined : workers.get(sessionId);
  const { request } = p;
  // A GET carries no body to name an operation in.
  const operation = request.method !== GET_METHOD ? graphqlOperation(request.postData) : undefined;
  // Held before it was listed.
  const heldId = ctx.heldMarks.get(p.requestId);
  ctx.heldMarks.delete(p.requestId);
  const initiator = initiatorFrames(p.initiator);
  const entry = log.add({
    sessionId,
    requestId: p.requestId,
    sentAt: p.timestamp,
    requestHeaders: toHeaders(request.headers),
    responseHeaders: [],
    statusText: '',
    ...(request.postData !== undefined ? { postData: request.postData } : {}),
    row: {
      url: request.url,
      method: request.method,
      type: p.type ?? UNTYPED,
      state: 'pending',
      status: 0,
      mimeType: '',
      startedAt: Math.round(p.wallTime * MS_PER_SECOND),
      ...(worker ? { worker: { ...worker } } : {}),
      ...(!worker && p.frameId ? { frameId: p.frameId } : {}),
      hasBody: !!request.hasPostData || request.postData !== undefined,
      ...(operation ? { operation } : {}),
      ...(heldId ? { heldId } : {}),
      ...(initiator.length ? { initiator } : {}),
      pageLoad: page.load,
    },
  });
  batch.changed(entry.row.id);
}
