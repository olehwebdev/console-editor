import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Kbd } from '@/shared/ui/kbd';
import { togglePicking } from '@/features/inspect/pick';

/** Nothing picked yet (or the workspace changed since). */
export function NoComponent() {
  return (
    <EmptyState
      icon={icons.ComponentIcon}
      title="Pick an element"
      className="mt-24"
      actions={
        <Button size="sm" variant="secondary" onClick={() => void togglePicking()} trailing={<Kbd keys={SHORTCUT.pickElement} />}>
          Pick an element
        </Button>
      }
    >
      Click one in the page to see the component that rendered it, where it is defined, and what it holds.
    </EmptyState>
  );
}
