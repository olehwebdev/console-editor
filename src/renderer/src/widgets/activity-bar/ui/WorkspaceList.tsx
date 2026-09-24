import { motion, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import type { Workspace } from '@common/types';
import { icons } from '@/shared/config';
import { cn, SPRING_LAYOUT, SPRING_PRESS } from '@/shared/lib';
import { IconButton } from '@/shared/ui/icon-button';
import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { Popover } from '@/shared/ui/popover';
import { Spinner } from '@/shared/ui/spinner';
import { Tooltip } from '@/shared/ui/tooltip';
import { WorkspaceIcon, useWorkspaceStore, workspaceDetail, workspaceLabel } from '@/entities/workspace';
import { WorkspaceForm } from '@/features/edit-workspace';

export interface WorkspaceListProps {
  onSwitch(id: string): void;
  onCreate(): void;
  onDelete(id: string): void;
}

/** The workspace being edited, and the tile the popover opens beside (kept while it animates out). */
interface Editing {
  id: string;
  anchor: HTMLElement;
}

interface TileProps {
  workspace: Workspace;
  /** The last one can't be deleted. */
  deletable: boolean;
  onSwitch(id: string): void;
  onEdit(id: string, tile: HTMLElement): void;
  onDelete(id: string): void;
}

function WorkspaceTile({ workspace, deletable, onSwitch, onEdit, onDelete }: TileProps) {
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
          <motion.span layoutId="workspace-indicator" transition={SPRING_LAYOUT} className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-fg" />
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
            whileTap={reduce ? undefined : { scale: 0.9 }}
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

/**
 * The workspaces in the rail: a tile each (site icon or coloured letter), the
 * current one marked; + adds one. Clicking the current tile edits it.
 */
export function WorkspaceList({ onSwitch, onCreate, onDelete }: WorkspaceListProps) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const edited = editing ? workspaces.find((w) => w.id === editing.id) : undefined;

  // Its tile toggles it.
  const edit = (id: string, anchor: HTMLElement) => {
    const again = editorOpen && editing?.id === id;
    setEditing({ id, anchor });
    setEditorOpen(!again);
  };
  const finishEdit = () => {
    setEditorOpen(false);
    editing?.anchor.focus({ preventScroll: true });
  };

  return (
    <div role="list" aria-label="Workspaces" className="flex min-h-0 w-full flex-col items-center gap-1 overflow-y-auto py-0.5 [scrollbar-width:none]">
      {workspaces.map((w) => (
        <WorkspaceTile key={w.id} workspace={w} deletable={workspaces.length > 1} onSwitch={onSwitch} onEdit={edit} onDelete={onDelete} />
      ))}
      <div role="listitem" className="flex w-full shrink-0 justify-center">
        <IconButton data-testid="workspace-new" icon={icons.AddIcon} label="New workspace" size="lg" tooltipSide="right" onClick={onCreate} className="text-fg-subtle" />
      </div>
      <Popover open={editorOpen && !!edited} onOpenChange={setEditorOpen} anchor={editing?.anchor ?? null} label="Workspace name and icon">
        {edited ? <WorkspaceForm key={edited.id} workspace={edited} onDone={finishEdit} /> : null}
      </Popover>
    </div>
  );
}
