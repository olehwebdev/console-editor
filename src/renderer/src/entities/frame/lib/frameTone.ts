import { WORKSPACE_COLORS, type WorkspaceColor } from '@common/types';

/** Spreads keys over the colours: a string hash (FNV-1a's offset and prime). */
const HASH_SEED = 2166136261;
const HASH_PRIME = 16777619;

/** A frame's colour, from its key: the same service keeps its colour across reloads and runs. */
export function frameTone(key: string): WorkspaceColor {
  let hash = HASH_SEED;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), HASH_PRIME);
  return WORKSPACE_COLORS[(hash >>> 0) % WORKSPACE_COLORS.length]!;
}
