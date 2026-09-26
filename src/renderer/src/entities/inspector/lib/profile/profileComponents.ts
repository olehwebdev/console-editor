import type { RenderCommit } from '@common/types';
import { profileCommits } from './profileCommits';
import { sortProfiles } from './sortProfiles';
import type { ComponentProfile } from './types';

/** The Renders log by component (every instance of a function together): the profiler's view, sorted (`sortProfiles`). */
export function profileComponents(commits: readonly RenderCommit[]): ComponentProfile[] {
  return sortProfiles(profileCommits(new Map(), commits, []));
}
