import { cn } from '@/shared/lib';
import { REQUEST_GROUPS } from '@/entities/network-request';
import { type GroupChoice, useNetworkFilter } from '@/features/network/filter';
import { GROUP_LABELS } from './constants';

// Actions never change, so they are read once instead of subscribed to.
const { setGroup } = useNetworkFilter.getState();

const CHIP = 'inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/50';

/** Every group, then each one: All first. */
const CHOICES: readonly GroupChoice[] = ['all', ...REQUEST_GROUPS];

/** Which kind of requests show: Fetch/XHR (what the page's code asks for) at first, or all, or another type. */
export function GroupChips() {
  const group = useNetworkFilter((s) => s.group);
  return (
    <div role="group" aria-label="Requests shown" className="flex min-w-0 items-center gap-1 overflow-x-auto px-2 pb-1.5 [scrollbar-width:none]">
      {CHOICES.map((choice) => (
        <button
          key={choice}
          type="button"
          aria-pressed={choice === group}
          data-testid="network-group"
          data-group={choice}
          onClick={() => setGroup(choice)}
          className={cn(CHIP, choice === group ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:bg-hover')}
        >
          {GROUP_LABELS[choice]}
        </button>
      ))}
    </div>
  );
}
