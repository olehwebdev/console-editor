import type { ConsoleFrame } from '@common/types';
import { frameKey } from '@/entities/frame';

/** The frame the prompt runs code in: the one picked while it is on the page, else the first with its key (after a reload). */
export function resolveTarget(frames: readonly ConsoleFrame[], targetKey: string, targetId: string | null): ConsoleFrame | null {
  return frames.find((f) => f.id === targetId) ?? frames.find((f) => frameKey(f) === targetKey) ?? null;
}
