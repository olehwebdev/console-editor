import { useState } from 'react';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Popover } from '@/shared/ui/popover';
import { useBreakpoints } from '../model';
import { BreakpointList } from './BreakpointList';
import { NewBreakpoint } from './NewBreakpoint';

/** The breakpoints menu: lit while one is on; opens the list and a form to add one below the button. */
export function BreakpointsButton() {
  const breakpoints = useBreakpoints();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const on = breakpoints.filter((b) => b.enabled).length;
  return (
    <>
      <IconButton
        icon={icons.BreakpointIcon}
        label={on ? `Breakpoints (${on} on)` : 'Breakpoints'}
        size="sm"
        active={on > 0}
        aria-expanded={open}
        data-testid="network-breakpoints"
        onClick={(event) => {
          setAnchor(event.currentTarget);
          setOpen(!open);
        }}
      />
      <Popover open={open} onOpenChange={setOpen} anchor={anchor} side="bottom" label="Breakpoints" className="w-[480px] max-w-[calc(100vw-32px)]">
        <div className="flex flex-col gap-2">
          <span className="label-caps">Breakpoints</span>
          <BreakpointList breakpoints={breakpoints} />
          <NewBreakpoint />
        </div>
      </Popover>
    </>
  );
}
