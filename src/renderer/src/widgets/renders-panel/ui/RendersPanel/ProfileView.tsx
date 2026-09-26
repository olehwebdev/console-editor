import { useMemo } from 'react';
import { cn } from '@/shared/lib';
import { sortProfiles, useRenderLog } from '@/entities/inspector';
import { MAX_PROFILES, PROFILE_GRID } from './constants';
import { ProfileRow } from './ProfileRow';

/**
 * The recorded renders by component (the profiler's view): each component's renders, mounts and skips, its
 * own render time summed where React measured it, and the reasons it rendered for, most frequent first. The
 * log keeps the profile as commits come and go; only the rows whose profile changed re-render.
 */
export function ProfileView() {
  const profiles = useRenderLog((s) => s.profiles);
  const sorted = useMemo(() => sortProfiles(profiles).slice(0, MAX_PROFILES), [profiles]);
  if (!sorted.length) return <p className="px-3 py-2 text-[12px] text-fg-subtle">Nothing recorded yet: each component that renders is counted here.</p>;
  return (
    <div role="table" aria-label="Renders by component" data-testid="render-profile" className="h-full overflow-y-auto text-[12.5px]">
      <div role="row" className={cn(PROFILE_GRID, 'sticky top-0 border-b border-line bg-surface-editor px-3 py-1 text-[11px] text-fg-subtle')}>
        <span role="columnheader">Component</span>
        <span role="columnheader" className="text-right">Renders</span>
        <span role="columnheader" className="text-right">Mounts</span>
        <span role="columnheader" className="text-right">Skipped</span>
        <span role="columnheader" className="text-right" title="Its own renders, children not included (development and profiling builds)">
          Time
        </span>
        <span role="columnheader">Why</span>
        <span role="columnheader" className="sr-only">
          Code
        </span>
      </div>
      {sorted.map((profile) => (
        <ProfileRow key={profile.key} profile={profile} />
      ))}
    </div>
  );
}
