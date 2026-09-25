import type { ResourceContent } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { decodeBody } from '../transform';
import { networkBody } from './networkBody';
import { sha256 } from './sha256';
import type { EngineOptions, TrackedResource } from './types';

/**
 * Returns the upstream content of a resource the page loaded (`tracked`, if
 * listed). Resources that were served from an override are re-fetched (with
 * `fallbackFetch`) so we never mistake the edited copy for the original.
 */
export async function readResourceContent(
  cdp: CdpTransport,
  url: string,
  tracked: TrackedResource | undefined,
  fallbackFetch: EngineOptions['fallbackFetch'],
): Promise<ResourceContent> {
  const attempts: Array<() => Promise<string>> = [];
  // What the page got may be an override either way when a service worker answered it.
  if (tracked && !tracked.entry.overrideId && !tracked.fromServiceWorker) {
    attempts.push(() => networkBody(cdp, tracked.requestId, tracked.entry.mimeType));
    if (tracked.frameId) {
      const frameId = tracked.frameId;
      attempts.push(async () => {
        const r = await cdp.send<{ content: string; base64Encoded: boolean }>(CDP.Page.getResourceContent, {
          frameId,
          url,
        });
        return decodeBody(r.content, r.base64Encoded);
      });
    }
  }
  if (fallbackFetch) attempts.push(() => fallbackFetch(url));

  let lastError: unknown = new Error(`No content available for ${url}`);
  for (const attempt of attempts) {
    try {
      const content = await attempt();
      return { url, content, hash: tracked?.upstreamHash ?? sha256(content), ...(tracked?.sourceMap ? { sourceMap: tracked.sourceMap } : {}) };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
