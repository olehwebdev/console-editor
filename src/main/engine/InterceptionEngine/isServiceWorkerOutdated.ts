import type { Override } from '../../../shared/types';
import { SCRIPT_KIND } from './constants';
import { originOf } from './originOf';
import type { ServiceWorkerState } from './types';

/**
 * Whether a service worker runs code other than what would be served now (an
 * override of one of its scripts was added, changed or turned off since it
 * was installed). Chromium doesn't fetch installed scripts on reload, so it
 * must be reinstalled. One installed before any session of this run saw it (in
 * an earlier run, say) may run edits of any of its site's scripts, and which
 * it imported is unknown: it counts as outdated while its site has script
 * overrides, so it's reinstalled once, through interception.
 *
 * `versionOf` gives the version of the override that would serve a script now
 * (`id@updatedAt`, '' for the live file).
 */
export function isServiceWorkerOutdated(
  state: ServiceWorkerState,
  overrides: Override[],
  versionOf: (url: string, resourceType: string) => string,
): boolean {
  if (!state.installSeen) {
    const origin = originOf(state.url);
    return overrides.some((o) => o.kind === SCRIPT_KIND && originOf(o.sourceUrl) === origin);
  }
  return state.scripts.some(({ url }) => {
    const served = state.servedScripts.get(url);
    return versionOf(url, served?.resourceType ?? SCRIPT_KIND) !== (served?.version ?? '');
  });
}
