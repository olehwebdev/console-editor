import { MAX_FRAME_ADDRESS, MAX_FRAME_NAME } from '../../shared/constants';
import { MAX_FRAME_NAMES } from './constants';

/** Keeps well-formed frame names (address -> name, trimmed, not empty), so a corrupt file or a bad message can't inject junk. */
export function sanitizeFrameNames(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const names: Record<string, string> = {};
  for (const [address, name] of Object.entries(input).slice(0, MAX_FRAME_NAMES)) {
    if (address.length > MAX_FRAME_ADDRESS || typeof name !== 'string') continue;
    const trimmed = name.trim().slice(0, MAX_FRAME_NAME);
    if (trimmed) names[address] = trimmed;
  }
  return names;
}
