import { CDP } from '../../engine/constants';
import type { InspectedSessions } from '../types';

/**
 * Hides every session's highlight, and turns the Overlay domain off, which otherwise taxes every layout of the
 * page (commits of large pages take twice as long); not while picking, which is drawn by it.
 */
export async function hideHighlights(sessions: InspectedSessions, picking: boolean): Promise<void> {
  await Promise.all(
    sessions.all().map(async ([, session]) => {
      await session.transport.send(CDP.Overlay.hideHighlight).catch(() => undefined);
      if (!picking) await session.transport.send(CDP.Overlay.disable).catch(() => undefined);
    }),
  );
}
