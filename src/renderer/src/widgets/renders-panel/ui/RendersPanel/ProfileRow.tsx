import { memo } from 'react';
import { cn } from '@/shared/lib';
import { linkNameAt, reasonCounts, useOrigin, type ComponentProfile } from '@/entities/inspector';
import { CodeLink } from '@/features/open-resource';
import { DURATION_DIGITS, PROFILE_GRID } from './constants';

/** A component in the By component view; it re-renders when its own profile or original changes, not another's. */
export const ProfileRow = memo(function ProfileRow({ profile }: { profile: ComponentProfile }) {
  const origin = useOrigin(profile.location);
  return (
    <div role="row" className={cn(PROFILE_GRID, 'min-h-6 border-b border-line/60 px-3')} data-testid="render-profile-row">
      <span role="cell" className="truncate">
        {linkNameAt(profile, 'react', origin)}
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
  );
});
