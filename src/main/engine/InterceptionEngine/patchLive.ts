import { applyJsonEdits, parseJson, stringifyJson, type JsonEdit } from '../../../shared/json';
import type { UnpatchedReason } from '../../../shared/types';

/** The live body with the edits applied, or why it couldn't be. */
export function patchLive(edits: readonly JsonEdit[] | null, live: string | undefined): { body: string } | { reason: UnpatchedReason } {
  if (!edits) return { reason: 'saved' };
  if (live === undefined) return { reason: 'live' };
  let tree;
  try {
    tree = parseJson(live);
  } catch {
    return { reason: 'live' };
  }
  // Nothing edited: the live text as it came, spacing and all.
  if (!edits.length) return { body: live };
  const patched = applyJsonEdits(tree, edits);
  return patched ? { body: stringifyJson(patched) } : { reason: 'shape' };
}
