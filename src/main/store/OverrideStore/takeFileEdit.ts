import type { CommittedOverrides } from './CommittedOverrides';
import type { ContentFiles } from './ContentFiles';

/**
 * Takes override `id`'s file as it is on disk when another editor changed it: true when it did.
 * Queued with the other changes, so the app's own writes read back as unchanged.
 */
export function takeFileEdit(committed: CommittedOverrides, files: ContentFiles, id: string): Promise<boolean> {
  return committed.mutateIf(async (overrides) => {
    const current = overrides.get(id);
    const text = current ? await files.readIfThere(current, 'content') : null;
    // A file being replaced (written elsewhere, then renamed over it) is taken once it is back.
    if (!current || text === null || text === current.content) return false;
    overrides.set(id, { ...current, content: text, updatedAt: Date.now() });
    return true;
  });
}
