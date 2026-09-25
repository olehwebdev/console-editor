import { useState } from 'react';
import { KEY } from '@/shared/config';
import { Input } from '@/shared/ui/input';
import { Popover } from '@/shared/ui/popover';
import { DemoButton } from './DemoButton';
import { Row } from './Row';

/** A rename field in a popover beside the button that opened it. */
export function PopoverRow() {
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Row title="Popover" note="A few controls beside an element. Not modal: Esc, a press or focus outside it close it.">
      <DemoButton
        data-state={popoverOpen ? 'open' : 'closed'}
        onClick={(e) => {
          setPopoverAnchor(e.currentTarget);
          setPopoverOpen(true);
        }}
      >
        Rename…
      </DemoButton>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen} anchor={popoverAnchor} side="bottom" label="Rename">
        <div className="flex w-[220px] flex-col gap-2">
          <span className="label-caps">Name</span>
          <Input autoFocus defaultValue="Checkout fix" onKeyDown={(e) => e.key === KEY.enter && setPopoverOpen(false)} />
        </div>
      </Popover>
    </Row>
  );
}
