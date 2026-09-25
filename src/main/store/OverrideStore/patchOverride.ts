import type { OverridePatch } from '../../../shared/types';
import type { StoredOverride } from '../types';

/** `current` with `patch` applied, updated now. */
export function patchOverride(current: StoredOverride, patch: OverridePatch): StoredOverride {
  return {
    ...current,
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    ...(patch.match ? { match: { ...patch.match } } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    updatedAt: Date.now(),
  };
}
