import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { useActionStore } from '@/entities/action';
import { setActionsOnTop } from '@/features/action/detach';
import { useActionEditor } from '@/features/action/edit';
import { MOVE_BUTTON } from './constants';
import type { ActionsPlacement } from './types';

const { startNew } = useActionEditor.getState();

/** The panel's title and buttons: a new action, moving the panel to the other place, and in its own window, Keep on top. */
export function PanelHeader({ placement }: { placement: ActionsPlacement }) {
  const onTop = useActionStore((s) => s.window.onTop);
  const move = MOVE_BUTTON[placement];
  return (
    <header className="flex h-10 shrink-0 items-center gap-0.5 pl-4 pr-2">
      <span className="label-caps min-w-0 flex-1 truncate">Actions</span>
      <IconButton icon={icons.AddIcon} label="New action" size="sm" data-testid="action-new" onClick={() => startNew()} />
      {placement === 'window' ? (
        <IconButton icon={icons.PinIcon} label="Keep on top" size="sm" active={onTop} data-testid="actions-on-top" onClick={() => void setActionsOnTop(!onTop)} />
      ) : null}
      <IconButton icon={move.icon} label={move.label} size="sm" data-testid="actions-move" onClick={() => void move.move()} />
    </header>
  );
}
