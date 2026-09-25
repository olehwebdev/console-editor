import type { RenderCommit } from '@common/types';
import { NAMED_PROFILE_PREFIX, PROFILE_COUNT } from '../constants';
import { locationKey } from '../locationKey';
import type { ComponentProfile, Profiles } from './types';

/**
 * The profile by component after commits joined the log (`added`) and older ones left it (`dropped`):
 * each counted in or out once, so keeping it costs what a batch holds, not what the log holds. A
 * component no commit names any more leaves it. The profiles it changes are copies.
 */
export function profileCommits(previous: Profiles, added: readonly RenderCommit[], dropped: readonly RenderCommit[]): Profiles {
  const profiles = new Map(previous);
  const copied = new Set<string>();
  const count = (commits: readonly RenderCommit[], sign: 1 | -1) => {
    for (const component of commits.flatMap((commit) => commit.components)) {
      const key = component.location ? locationKey(component.location) : `${NAMED_PROFILE_PREFIX}${component.name}`;
      const old = profiles.get(key);
      const profile: ComponentProfile =
        old && copied.has(key) ? old : old ? { ...old, reasons: { ...old.reasons } } : { key, name: component.name, location: component.location, mounts: 0, renders: 0, skips: 0, time: null, timed: 0, reasons: {} };
      copied.add(key);
      profile[PROFILE_COUNT[component.kind]] += sign;
      if (component.duration !== null) {
        profile.timed += sign;
        profile.time = profile.timed ? (profile.time ?? 0) + sign * component.duration : null;
      }
      for (const reason of component.reasons) profile.reasons[reason.kind] = (profile.reasons[reason.kind] ?? 0) + sign;
      profiles.set(key, profile);
    }
  };
  count(dropped, -1);
  count(added, 1);
  for (const [key, profile] of profiles) if (copied.has(key) && !profile.mounts && !profile.renders && !profile.skips) profiles.delete(key);
  return profiles;
}
