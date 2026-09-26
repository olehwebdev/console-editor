import { Button } from '@/shared/ui/button';
import { Kbd } from '@/shared/ui/kbd';
import { stopPicking } from '@/features/inspect/pick';

/** Picking is on: how to pick, and how to stop. */
export function PickingNotice() {
  return (
    <div className="mx-3 mb-2 flex flex-col items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-2 text-[12px] leading-snug text-fg-muted" data-testid="inspect-picking">
      <span className="font-medium text-accent">Picking an element</span>
      <span>
        Click one in the page, in any frame. <Kbd keys={['Esc']} /> stops.
      </span>
      <Button size="sm" variant="secondary" onClick={() => void stopPicking()}>
        Stop
      </Button>
    </div>
  );
}
