import { DOCUMENT_KIND } from './constants';
import type { FrameTracker } from './FrameTracker';

/**
 * Whether a request is the top-level page's own document, which no rule blocks.
 * A pause without a frame counts as the page: the safe side. Iframe documents,
 * which pause on their parent's session, stay blockable.
 */
export function isPageDocument(resourceType: string, frameId: string | undefined, frames: FrameTracker, onIframe: boolean): boolean {
  return !onIframe && resourceType === DOCUMENT_KIND && (!frameId || frameId === frames.rootId);
}
