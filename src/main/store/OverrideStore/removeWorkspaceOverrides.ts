import type { CommittedOverrides } from './CommittedOverrides';
import type { ContentFiles } from './ContentFiles';

/** Deletes every override of a workspace: from the index first, then their files. */
export async function removeWorkspaceOverrides(committed: CommittedOverrides, files: ContentFiles, workspaceId: string): Promise<void> {
  if (!committed.all().some((o) => o.workspaceId === workspaceId)) return;
  const gone = await committed.mutate(async (overrides) => {
    const gone = [...overrides.values()].filter((o) => o.workspaceId === workspaceId);
    for (const o of gone) overrides.delete(o.id);
    return gone;
  });
  for (const o of gone) await files.remove(o);
}
