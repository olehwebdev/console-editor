import { DOCUMENT_TYPE } from './constants';
import type { NetworkLogContext, RequestWillBeSent } from './types';

/**
 * Whether a request is the top-level page loading a new document: the main frame's own navigation
 * request (its request id is its loader id), on the page's session. A redirect's later hop belongs to
 * the load it continues. Before the main frame's first commit its id isn't known, and nothing counts.
 */
export function startsPageLoad({ page }: NetworkLogContext, p: RequestWillBeSent, sessionId: string | undefined): boolean {
  return (
    sessionId === undefined &&
    !p.redirectResponse &&
    p.type === DOCUMENT_TYPE &&
    p.requestId === p.loaderId &&
    page.mainFrameId !== undefined &&
    p.frameId === page.mainFrameId
  );
}
