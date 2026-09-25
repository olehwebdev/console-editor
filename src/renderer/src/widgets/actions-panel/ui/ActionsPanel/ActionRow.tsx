import type { ConsoleAction, ConsoleFrame } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { Spinner } from '@/shared/ui/spinner';
import { FrameChip, locateTarget } from '@/entities/frame';
import { deleteAction, duplicateAction, useActionEditor } from '@/features/action/edit';
import { runAction, useActionRuns } from '@/features/action/run';
import { ActionResult } from './ActionResult';

export interface ActionRowProps {
  action: ConsoleAction;
  frames: readonly ConsoleFrame[];
  names: Readonly<Record<string, string>>;
}

const { startEdit } = useActionEditor.getState();

/** One action: pressing it runs it in its frame; its frame, its last result, and what else it can do (also in its context menu). */
export function ActionRow({ action, frames, names }: ActionRowProps) {
  const run = useActionRuns((s) => s.runs[action.id]);
  const { frame, label } = locateTarget(frames, names, action.target, action.targetName);
  const ready = !!frame?.canRun;

  const items: MenuItem[] = [
    { label: 'Run', icon: icons.RunIcon, disabled: !ready, onSelect: () => void runAction(action) },
    { label: 'Edit', icon: icons.EditIcon, onSelect: () => startEdit(action) },
    { label: 'Duplicate', icon: icons.AddIcon, onSelect: () => void duplicateAction(action) },
    { label: 'Copy code', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(action.code) },
    { separator: true },
    { label: 'Delete action', icon: icons.DeleteIcon, danger: true, onSelect: () => void deleteAction(action) },
  ];

  return (
    <ContextMenu items={items} label={`${action.name} actions`}>
      <div role="listitem" data-hover-row data-testid="action-row" data-action-id={action.id} className="group flex min-w-0 flex-col gap-0.5 rounded-md px-1 py-1">
        <div className="flex h-6 min-w-0 items-center gap-1.5">
          <button
            type="button"
            data-testid="action-run"
            aria-label={`Run ${action.name}`}
            aria-busy={run?.state === 'running' || undefined}
            title={action.code}
            onClick={() => void runAction(action)}
            className="flex h-6 min-w-0 flex-1 items-center gap-2 rounded-md pl-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <span className={cn('grid size-4 shrink-0 place-items-center', ready ? 'text-accent' : 'text-fg-subtle')}>
              {run?.state === 'running' ? <Spinner size={12} /> : <Icon icon={icons.RunIcon} size={14} />}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{action.name}</span>
          </button>
          <FrameChip frameKey={action.target} label={label} title={frame ? frame.url : "This frame isn't on the page"} gone={!frame} />
          <IconButton
            icon={icons.EditIcon}
            label="Edit action"
            size="sm"
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => startEdit(action)}
          />
        </div>
        {run && run.state !== 'running' ? <ActionResult run={run} /> : null}
      </div>
    </ContextMenu>
  );
}
