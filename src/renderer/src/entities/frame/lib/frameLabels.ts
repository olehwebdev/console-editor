import type { ConsoleFrame } from '@common/types';
import { frameLabel } from './frameLabel';

/** Every frame's label, by id; frames that would read the same are numbered (`rating`, `rating #2`). */
export function frameLabels(frames: readonly ConsoleFrame[], names: Readonly<Record<string, string>>): Map<string, string> {
  const labels = new Map<string, string>();
  const uses = new Map<string, number>();
  for (const frame of frames) {
    const label = frameLabel(frame, names);
    const count = (uses.get(label) ?? 0) + 1;
    uses.set(label, count);
    labels.set(frame.id, count > 1 ? `${label} #${count}` : label);
  }
  return labels;
}
