import type { CodeLocation, RenderCommit } from '@common/types';
import { locationKey, useRenderLog } from '@/entities/inspector';
import { locateLocations, nameHooksAt } from '@/features/open-resource';

/** Commits recorded: they join the Renders log, and their components' functions are traced to the originals (names, hook names). */
export function receiveRenders(commits: RenderCommit[]): void {
  useRenderLog.getState().add(commits);
  const components = commits.flatMap((commit) => commit.components);
  const located = new Map(components.flatMap((c) => (c.location ? [[locationKey(c.location), c.location] as const] : [])));
  // Only a component whose own hooks changed needs their names.
  const hooked = new Map<string, CodeLocation>(
    components.flatMap((c) => (c.location && c.reasons.some((r) => r.kind === 'state' || r.kind === 'store') ? [[locationKey(c.location), c.location] as const] : [])),
  );
  void locateLocations([...located.values()]).then(() => Promise.all([...hooked.values()].map(nameHooksAt)));
}
