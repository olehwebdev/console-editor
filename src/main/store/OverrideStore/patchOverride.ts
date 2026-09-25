import type { OverridePatch } from '../../../shared/types';
import type { StoredOverride } from '../types';
import { responseFieldsOf } from './responseFieldsOf';

/** `current` with `patch` applied, updated now. A response override's settings are checked and copied. */
export function patchOverride(current: StoredOverride, patch: OverridePatch): StoredOverride {
  return {
    ...current,
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    ...(patch.match ? { match: { ...patch.match } } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    ...(patch.request || patch.response ? responseFieldsOf(current.kind, patch.request, patch.response, current) : {}),
    updatedAt: Date.now(),
  };
}
