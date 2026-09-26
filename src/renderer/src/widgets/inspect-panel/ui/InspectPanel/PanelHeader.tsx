import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { togglePicking } from '@/features/inspect/pick';

/** The view's title, and picking an element: on while it picks. */
export function PanelHeader({ picking }: { picking: boolean }) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-0.5 pl-4 pr-2">
      <span className="label-caps min-w-0 flex-1 truncate">Inspect</span>
      <IconButton
        icon={icons.PickIcon}
        label={picking ? 'Stop picking' : 'Pick an element in the page'}
        shortcut={SHORTCUT.pickElement}
        size="sm"
        active={picking}
        onClick={() => void togglePicking()}
        data-testid="inspect-pick"
      />
    </header>
  );
}
