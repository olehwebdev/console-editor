import type { SessionKey } from '../../console/ConsoleFrames';
import { CDP } from '../../engine/constants';
import { MAX_FRAME_HOPS, PICK_GONE } from '../constants';
import type { InspectedSessions } from '../types';

/**
 * Where a session's viewport sits in the top page's, in CSS pixels: the page's own is at 0,0; an iframe another process
 * runs is where its `<iframe>` element's content box is in its parent's session, and so on up to the page. The
 * parent is the session that knows the frame's owner element (`DOM.getFrameOwner`).
 */
export async function frameOffset(sessions: InspectedSessions, sessionId: SessionKey): Promise<{ x: number; y: number }> {
  let x = 0;
  let y = 0;
  let current = sessionId;
  for (let hops = 0; current !== undefined; hops++) {
    const child = sessions.get(current);
    if (!child || hops >= MAX_FRAME_HOPS) throw new Error(PICK_GONE);
    const { frameTree } = await child.transport.send<{ frameTree: { frame: { id: string } } }>(CDP.Page.getFrameTree);
    let owner: { sessionId: SessionKey; backendNodeId: number } | null = null;
    for (const [key, session] of sessions.all()) {
      if (key === current || owner) continue;
      await session.transport.send(CDP.DOM.enable).catch(() => undefined);
      const found = await session.transport.send<{ backendNodeId: number }>(CDP.DOM.getFrameOwner, { frameId: frameTree.frame.id }).catch(() => null);
      if (found) owner = { sessionId: key, backendNodeId: found.backendNodeId };
    }
    if (!owner) throw new Error(PICK_GONE);
    const { model } = await sessions.get(owner.sessionId)!.transport.send<{ model: { content: number[] } }>(CDP.DOM.getBoxModel, { backendNodeId: owner.backendNodeId });
    x += model.content[0];
    y += model.content[1];
    current = owner.sessionId;
  }
  return { x, y };
}
