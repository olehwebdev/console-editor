import type { CodeLocation, RenderCommit, RenderReasonKind } from '@common/types';
import { NAMED_PROFILE_PREFIX, PROFILE_COUNT } from './constants';
import { locationKey } from './locationKey';

/** A component across the commits recorded: how often it took part, and how long its own renders took. */
export interface ComponentProfile {
  /** Its function's place (`locationKey`), or its name when the page gave none. */
  key: string;
  name: string;
  location: CodeLocation | null;
  mounts: number;
  renders: number;
  skips: number;
  /** Its own renders' time summed (ms), its children's not included, where React measured it; null when it never did. */
  time: number | null;
  /** How many of its renders each reason was among the reasons of. */
  reasons: Partial<Record<RenderReasonKind, number>>;
}

/**
 * The Renders log by component (every instance of a function together): the profiler's view. Those that took
 * the most time first, where it was measured, then those that rendered most.
 */
export function profileComponents(commits: readonly RenderCommit[]): ComponentProfile[] {
  const profiles = new Map<string, ComponentProfile>();
  for (const component of commits.flatMap((commit) => commit.components)) {
    const key = component.location ? locationKey(component.location) : `${NAMED_PROFILE_PREFIX}${component.name}`;
    const profile = profiles.get(key) ?? { key, name: component.name, location: component.location, mounts: 0, renders: 0, skips: 0, time: null, reasons: {} };
    profile[PROFILE_COUNT[component.kind]] += 1;
    if (component.duration !== null) profile.time = (profile.time ?? 0) + component.duration;
    for (const reason of component.reasons) profile.reasons[reason.kind] = (profile.reasons[reason.kind] ?? 0) + 1;
    profiles.set(key, profile);
  }
  return [...profiles.values()].sort((a, b) => (b.time ?? 0) - (a.time ?? 0) || b.renders + b.mounts - (a.renders + a.mounts));
}
