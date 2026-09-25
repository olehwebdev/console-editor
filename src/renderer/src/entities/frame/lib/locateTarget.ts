import type { ConsoleFrame } from '@common/types';
import { findFrame } from './findFrame';
import { frameLabels } from './frameLabels';
import { keyLabel } from './keyLabel';

/**
 * Where code aimed at a frame (by its key, and its `name` attribute as a
 * fallback) runs now, and what that frame is called: as the console labels it
 * while it is on the page, else by its key. `frame` is null while it isn't.
 */
export function locateTarget(
  frames: readonly ConsoleFrame[],
  names: Readonly<Record<string, string>>,
  key: string,
  name: string,
): { frame: ConsoleFrame | null; label: string } {
  const frame = findFrame(frames, key, name);
  return { frame, label: (frame && frameLabels(frames, names).get(frame.id)) || keyLabel(key, names, name) };
}
