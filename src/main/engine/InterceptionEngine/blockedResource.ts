import type { ResourceEntry } from '../../../shared/types';
import { BLOCKED_STATUS, DOCUMENT_KIND, UNLISTED_URL } from './constants';
import { isKind } from './isKind';
import type { RequestPausedParams, ResourceTrackerContext, TrackedResource } from './types';

/**
 * The entry for a document, script or stylesheet a rule blocked, which never
 * gets a `Network.responseReceived`: listed, it stays in the tree (and can
 * still be opened). None while the root frame is navigating (it would be the
 * old page's), nor over the top frame's entry for the same file.
 */
export function blockedResource(
  ctx: Pick<ResourceTrackerContext, 'frames' | 'navigation' | 'opts' | 'worker'>,
  p: RequestPausedParams,
  ruleId: string,
  existing: TrackedResource | undefined,
): TrackedResource | undefined {
  const url = p.request.url;
  if (!isKind(p.resourceType) || UNLISTED_URL.test(url) || ctx.navigation.active) return undefined;
  const kind = p.resourceType;
  const frame = ctx.worker ? undefined : ctx.frames.frameOf(p.frameId, kind === DOCUMENT_KIND ? url : undefined);
  // The same file blocked in the top frame and in an iframe is listed as the top frame's.
  if (existing && !existing.entry.frame && frame && existing.entry.blockedBy === ruleId) return undefined;
  const iframeId = ctx.opts.iframe?.id;
  const entry: ResourceEntry = {
    url,
    kind,
    mimeType: '',
    status: BLOCKED_STATUS,
    blockedBy: ruleId,
    ...(frame ? { frame } : {}),
    ...(iframeId ? { iframeId } : {}),
    ...ctx.worker?.label(),
  };
  return { entry, requestId: p.networkId ?? p.requestId, frameId: p.frameId };
}
