import { useMemo } from 'react';
import type { RenderCommit } from '@common/types';
import { cn } from '@/shared/lib';
import { linkName, profileComponents, reasonCounts, useInspectorStore } from '@/entities/inspector';
import { CodeLink } from '@/features/open-resource';
import { DURATION_DIGITS, MAX_PROFILES, PROFILE_GRID } from './constants';

/**
 * The recorded renders by component (the profiler's view): each component's renders, mounts and skips, its
 * own render time summed where React measured it, and the reasons it rendered for, most frequent first.
 */
export function ProfileView({ commits }: { commits: readonly RenderCommit[] }) {
  const origins = useInspectorStore((s) => s.origins);
  // Up to 2,000 commits of up to 200 components each: summed once per change of the log.
  const profiles = useMemo(() => profileComponents(commits), [commits]);
  if (!profiles.length) return <p className="px-3 py-2 text-[12px] text-fg-subtle">Nothing recorded yet: each component that renders is counted here.</p>;
  return (
    <div role="table" aria-label="Renders by component" data-testid="render-profile" className="text-[12.5px]">
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
      {profiles.slice(0, MAX_PROFILES).map((profile) => (
        <div role="row" key={profile.key} className={cn(PROFILE_GRID, 'min-h-6 border-b border-line/60 px-3')} data-testid="render-profile-row">
          <span role="cell" className="truncate">
            {linkName(profile, 'react', origins)}
          </span>
          <span role="cell" className="text-right tabular-nums">
            {profile.renders}
          </span>
          <span role="cell" className="text-right tabular-nums text-fg-muted">
            {profile.mounts}
          </span>
          <span role="cell" className="text-right tabular-nums text-fg-muted">
            {profile.skips}
          </span>
          <span role="cell" className="text-right tabular-nums text-fg-muted">
            {profile.time === null ? '—' : `${profile.time.toFixed(DURATION_DIGITS)} ms`}
          </span>
          <span role="cell" className="truncate font-mono text-[12px] text-fg-muted">
            {reasonCounts(profile.reasons)}
          </span>
          <span role="cell">
            <CodeLink location={profile.location} />
          </span>
        </div>
      ))}
    </div>
  );
}
