import type { Rect } from '../../../shared/types';
import { CDP } from '../../engine/constants';
import { PICK_GONE } from '../constants';
import type { InspectedSessions, Pick } from '../types';
import { frameOffset } from './frameOffset';

/** A quad's corners, as `DOM.getBoxModel` lists them: x1, y1, … x4, y4. */
const QUAD_POINTS = [0, 2, 4, 6] as const;

/** Where a picked element's border box is, in the top page's viewport (CSS pixels), whatever frame it is in. */
export async function elementBox(sessions: InspectedSessions, pick: Pick): Promise<Rect> {
  const session = sessions.get(pick.sessionId);
  if (!session) throw new Error(PICK_GONE);
  const { model } = await session.transport.send<{ model: { border: number[] } }>(CDP.DOM.getBoxModel, { backendNodeId: pick.backendNodeId }).catch(() => {
    throw new Error(PICK_GONE);
  });
  const xs = QUAD_POINTS.map((i) => model.border[i]);
  const ys = QUAD_POINTS.map((i) => model.border[i + 1]);
  const offset = await frameOffset(sessions, pick.sessionId);
  return { x: Math.min(...xs) + offset.x, y: Math.min(...ys) + offset.y, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
