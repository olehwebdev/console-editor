import type { NetworkLogContext } from '../types';

/** `Page.frameNavigated` on the page's own session: learns the main frame, whose next navigations start page loads. */
export function frameNavigated({ page }: NetworkLogContext, p: { frame: { id: string; parentId?: string } }, sessionId: string | undefined): void {
  if (sessionId === undefined && !p.frame.parentId) page.mainFrameId = p.frame.id;
}
