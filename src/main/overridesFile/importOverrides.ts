import type { OverridesImport } from '../../shared/types';
import type { OverrideStore } from '../store/OverrideStore';
import { overrideInputOf } from './overrideInputOf';
import { sameOverrideTarget } from './sameOverrideTarget';

/**
 * Adds an export's overrides to the active workspace, counting into `counts`: none that one of its
 * own already answers (it keeps yours), and none that can't be read.
 */
export async function importOverrides(store: OverrideStore, entries: readonly unknown[], counts: OverridesImport): Promise<void> {
  for (const entry of entries) {
    const input = overrideInputOf(entry);
    if (!input) {
      counts.unreadable++;
      continue;
    }
    // Listed again each time, so a file naming one twice adds it once.
    if (store.list().some((o) => sameOverrideTarget(o, input))) {
      counts.present++;
      continue;
    }
    const { enabled, ...create } = input;
    const created = await store.create(create);
    if (!enabled) await store.update(created.id, { enabled });
    counts.overrides++;
  }
}
