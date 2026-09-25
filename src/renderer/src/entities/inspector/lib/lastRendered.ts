import type { RenderCommit } from '@common/types';
import { renderKey } from './renderKey';

/** The components (`renderKey`) a frame's last commit mounted or rendered. */
export function lastRendered(commits: readonly RenderCommit[], frameId: string | null): ReadonlySet<string> {
  const last = commits.findLast((commit) => commit.frameId === frameId);
  return new Set(
    (last?.components ?? []).flatMap((c) => {
      const key = c.kind === 'skip' ? null : renderKey(c.location, c.key);
      return key ? [key] : [];
    }),
  );
}
