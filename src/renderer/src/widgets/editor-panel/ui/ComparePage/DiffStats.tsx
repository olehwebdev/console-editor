import type { ReactNode } from 'react';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Spinner } from '@/shared/ui/spinner';
import type { DiffState } from '@/features/shot/compare';
import { differingShare } from './differingShare';

export interface DiffStatsProps {
  diff: DiffState;
  onStep(step: number): void;
}

/** A comparison still working. */
const WORKING = (
  <>
    <Spinner size={12} /> Comparing…
  </>
);

/** What the bar says at each point of a comparison: a new status fails typecheck until it says something. */
const STATS: { [S in DiffState['status']]: (diff: Extract<DiffState, { status: S }>, onStep: (step: number) => void) => ReactNode } = {
  idle: () => WORKING,
  working: () => WORKING,
  failed: (diff) => <span className="text-danger">Could not compare them: {diff.error}</span>,
  done: (diff, onStep) => (
    <>
      <span className="text-fg">{differingShare(diff.differing, diff.total)} of pixels differ</span>
      {diff.smoothed ? <span data-testid="compare-smoothed">{differingShare(diff.smoothed, diff.total)} more only in anti-aliasing (yellow)</span> : null}
      <span>{diff.regions.length === 1 ? '1 area' : `${diff.regions.length} areas`}</span>
      <IconButton icon={icons.BackIcon} label="Previous area" size="sm" disabled={!diff.regions.length} onClick={() => onStep(-1)} />
      <IconButton icon={icons.ForwardIcon} label="Next area" size="sm" disabled={!diff.regions.length} onClick={() => onStep(1)} />
    </>
  ),
};

/** The difference's bar: how much differs, and stepping through the areas that do. */
export function DiffStats({ diff, onStep }: DiffStatsProps) {
  const render = STATS[diff.status] as (diff: DiffState, onStep: (step: number) => void) => ReactNode;
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-4 text-[12px] text-fg-muted" data-testid="compare-stats">
      {render(diff, onStep)}
    </div>
  );
}
