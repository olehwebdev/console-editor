import type { ResourceContent } from '../../../shared/types';
import { TARGET_TYPE } from '../constants';
import type { InterceptionEngine } from '../InterceptionEngine';
import type { ChildSessions } from './ChildSessions';
import { SETUP_TIMEOUT_MS } from './constants';
import { withTimeout } from './withTimeout';

/**
 * Reads a resource through the session that loaded it (the page's first). A
 * cross-site iframe's own document is reported by its parent, but only the
 * iframe's session can return its body; a worker's files only its session.
 */
export async function readPageResource(root: InterceptionEngine, children: ChildSessions, url: string): Promise<ResourceContent> {
  const owner = [root, ...children.engines()].find((e) => e.hasResource(url)) ?? root;
  const tracked = owner.trackedResource(url);
  const frameSession =
    tracked?.frameId && children.list().find((c) => c.type === TARGET_TYPE.iframe && c.targetId === tracked.frameId && c.engine !== owner);
  if (tracked && frameSession) {
    try {
      const content = await withTimeout(frameSession.engine.readNetworkBody(url, tracked.requestId, tracked.mimeType), SETUP_TIMEOUT_MS, 'Reading the iframe document');
      // The parent served (and may have rewritten) this document; it knows the raw upstream hash.
      return { ...content, hash: owner.upstreamHashOf(url) ?? content.hash };
    } catch {
      // Fall through to the owner (and its out-of-page fetch).
    }
  }
  if (owner === root) return owner.getResourceContent(url);
  // A stopped service worker answers Network commands only once it runs again.
  try {
    return await withTimeout(owner.getResourceContent(url), SETUP_TIMEOUT_MS, 'Reading the file');
  } catch {
    return root.getResourceContent(url);
  }
}
