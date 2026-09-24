import { useState } from 'react';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Popover } from '@/shared/ui/popover';
import { useWorkspaceStore } from '@/entities/workspace';
import { WorkspaceForm } from '@/features/edit-workspace';
import type { Editing, WorkspaceListProps } from './types';
import { WorkspaceTile } from './WorkspaceTile';

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
