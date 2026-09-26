import type { ComponentProfile, Profiles } from './types';

/** The profiles, those that took the most time first where it was measured, then those that rendered most (a tie keeps the order first seen). */
export function sortProfiles(profiles: Profiles): ComponentProfile[] {
  return [...profiles.values()].sort((a, b) => (b.time ?? 0) - (a.time ?? 0) || b.renders + b.mounts - (a.renders + a.mounts));
}
