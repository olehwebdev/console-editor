import type { Override } from '../../../shared/types';
import { editsOf } from './editsOf';
import { isEventStream } from './isEventStream';
import { isUpstreamOk } from './isUpstreamOk';
import { patchLive } from './patchLive';
import { readPausedBody } from './readPausedBody';
import type { PausedRequestContext, RequestPausedParams } from './types';

/**
 * What a response override in patch mode answers with: the live response with its edits applied. When
 * upstream failed it is the saved text (what works while the backend is down), and when the edits
 * can't be applied too, said with `override-unpatched`. A stream is never read.
 */
export async function patchedBody(ctx: PausedRequestContext, p: RequestPausedParams, override: Override, saved: string): Promise<string> {
  const { cdp, opts } = ctx;
  if (!isUpstreamOk(p) || isEventStream(p)) return saved;
  const [edits, live] = await Promise.all([editsOf(override, opts.getOverrideBase), readPausedBody(cdp, p)]);
  const patched = patchLive(edits, live);
  if ('body' in patched) return patched.body;
  opts.emit({ type: 'override-unpatched', overrideId: override.id, url: p.request.url, reason: patched.reason });
  return saved;
}
