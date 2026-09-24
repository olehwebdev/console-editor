import type { ConsoleFrame } from '../../../shared/types';
import type { FrameRecord } from '../types';

/** A frame as the renderer lists it. */
export function toConsoleFrame(r: FrameRecord): ConsoleFrame {
  return {
    id: r.id,
    ...(r.parentId ? { parentId: r.parentId } : {}),
    url: r.url,
    name: r.name,
    canRun: !!r.context,
  };
}
