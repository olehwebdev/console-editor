import { motion, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { icons } from '@/shared/config';
import { cn, ICON_PRESS_SCALE, SPRING_LAYOUT, SPRING_PRESS } from '@/shared/lib';
import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { Spinner } from '@/shared/ui/spinner';
import { Tooltip } from '@/shared/ui/tooltip';
import { WorkspaceIcon, useWorkspaceStore, workspaceDetail, workspaceLabel } from '@/entities/workspace';
import type { TileProps } from './types';

/** Motion's shared-layout id: one marker glides to the current workspace's tile. */
const INDICATOR_LAYOUT_ID = 'workspace-indicator';

/** A workspace's rail tile: switches to it, or edits it when it is the current one; its menu offers the rest. */
export function WorkspaceTile({ workspace, deletable, onSwitch, onEdit, onDelete }: TileProps) {
  const reduce = useReducedMotion();
  const active = useWorkspaceStore((s) => s.activeId === workspace.id);
  const switching = useWorkspaceStore((s) => s.switchingTo === workspace.id);
  const favicon = useWorkspaceStore((s) => s.favicons[workspace.id] ?? null);
  const tile = useRef<HTMLButtonElement>(null);
  const label = workspaceLabel(workspace);
  const detail = workspaceDetail(workspace);

  const items: MenuItem[] = [
    { label: 'Switch to it', icon: icons.BrowserIcon, disabled: active, onSelect: () => onSwitch(workspace.id) },
    { label: 'Name and icon…', icon: icons.EditIcon, onSelect: () => tile.current && onEdit(workspace.id, tile.current) },
    { separator: true },
    { label: 'Delete workspace…', icon: icons.DeleteIcon, danger: true, disabled: !deletable, onSelect: () => onDelete(workspace.id) },
  ];

  return (
    <ContextMenu items={items} label={`${label} actions`}>
      <div role="listitem" className="relative flex w-full shrink-0 justify-center">
        {active ? (
          <motion.span layoutId={INDICATOR_LAYOUT_ID} transition={SPRING_LAYOUT} className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-fg" />
        ) : null}
        <Tooltip
          side="right"
          describeTrigger={false}
          content={
            <span className="flex flex-col">
              <span className="font-medium text-fg">{label}</span>
              {detail ? <span className="max-w-[280px] truncate text-fg-muted">{detail}</span> : null}
              {active ? <span className="text-fg-subtle">Click to rename or change its icon</span> : null}
            </span>
          }
        >
          <motion.button
            ref={tile}
            type="button"
            data-testid="workspace-tile"
            data-workspace-id={workspace.id}
            aria-label={active ? `${label} (current workspace)` : `Switch to ${label}`}
            aria-current={active || undefined}
            whileTap={reduce ? undefined : { scale: ICON_PRESS_SCALE }}
            transition={SPRING_PRESS}
            // The current one opens its name and icon; any other is switched to.
            onClick={(e) => (active ? onEdit(workspace.id, e.currentTarget) : onSwitch(workspace.id))}
            className={cn(
              'relative grid size-9 place-items-center rounded-xl outline-none',
              'transition-[opacity,background-color,filter] duration-150 ease-out-expo hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50',
              !active && 'opacity-65 saturate-[.8] hover:opacity-100 hover:saturate-100',
            )}
          >
            <WorkspaceIcon workspace={workspace} favicon={favicon} />
            {switching ? (
              <span className="absolute inset-0 grid place-items-center rounded-xl bg-canvas/70 text-fg">
                <Spinner size={14} />
              </span>
            ) : null}
          </motion.button>
        </Tooltip>
      </div>
    </ContextMenu>
  );
}
