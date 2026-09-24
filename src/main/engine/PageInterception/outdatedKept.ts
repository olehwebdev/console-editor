import { isServiceWorkerOutdated, originOf } from '../InterceptionEngine';
import type { ChildContext } from './types';

/** Service workers of `url`'s site whose session went away, running outdated code, by target id. */
export function outdatedKept({ children, serviceWorkers, root, opts }: ChildContext, url: string | undefined): string[] {
  if (!url) return [];
  const origin = originOf(url);
  const attached = new Set(children.list().map((c) => c.targetId));
  const versionOf = (script: string, resourceType: string) => root.overrideVersion(script, resourceType);
  return serviceWorkers
    .detached(attached)
    .filter(([, state]) => originOf(state.url) === origin && isServiceWorkerOutdated(state, opts.getOverrides(), versionOf))
    .map(([targetId]) => targetId);
}
