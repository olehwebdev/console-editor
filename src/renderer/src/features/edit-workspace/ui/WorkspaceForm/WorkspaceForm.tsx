import { useId, useState } from 'react';
import { MAX_WORKSPACE_NAME } from '@common/constants';
import { WORKSPACE_COLORS, WORKSPACE_ICONS, type Workspace, type WorkspaceIcon as IconKind, type WorkspacePatch } from '@common/types';
import { KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Input } from '@/shared/ui/input';
import { WORKSPACE_SWATCH, WorkspaceIcon, useWorkspaceStore } from '@/entities/workspace';
import { editWorkspace } from '../../model/editWorkspace';
import { Choices } from './Choices';

/** What each icon choice is called. */
const ICON_LABEL: Record<IconKind, string> = { favicon: 'Site icon', color: 'Letter' };

export interface WorkspaceFormProps {
  workspace: Workspace;
  /** Enter in the name field: the edit is finished. */
  onDone(): void;
}

/**
 * Name, icon and colour of a workspace. Every change applies as it is made.
 * Give it `key={workspace.id}`: the name field starts from the workspace it opens on.
 */
export function WorkspaceForm({ workspace, onDone }: WorkspaceFormProps) {
  const id = useId();
  const iconGroup = `${id}-icon`;
  const colorGroup = `${id}-color`;
  const favicon = useWorkspaceStore((s) => s.favicons[workspace.id] ?? null);
  // What is typed shows at once; the store and the disk follow each keystroke.
  const [name, setName] = useState(workspace.name);
  const set = (patch: WorkspacePatch) => void editWorkspace(workspace.id, patch);

  return (
    <div className="flex w-[248px] flex-col gap-3" data-testid="workspace-form">
      <div className="flex items-center gap-2">
        <WorkspaceIcon workspace={{ ...workspace, name }} favicon={favicon} />
        <Input
          autoFocus
          aria-label="Workspace name"
          data-testid="workspace-name"
          value={name}
          maxLength={MAX_WORKSPACE_NAME}
          placeholder={workspace.host || 'Name this workspace'}
          onChange={(e) => {
            setName(e.target.value);
            set({ name: e.target.value });
          }}
          onKeyDown={(e) => {
            if (e.key === KEY.enter && !e.nativeEvent.isComposing) onDone();
          }}
          className="flex-1"
        />
      </div>

      <Choices legend="Icon" hint={workspace.icon === 'favicon' && !favicon ? 'The letter shows until the site has an icon.' : undefined}>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-canvas/60 p-0.5">
          {WORKSPACE_ICONS.map((icon) => (
            <label key={icon} className="cursor-pointer">
              <input
                type="radio"
                name={iconGroup}
                className="peer sr-only"
                checked={workspace.icon === icon}
                onChange={() => set({ icon })}
              />
              <span
                className={cn(
                  'flex h-6 items-center justify-center rounded-md text-[12px] text-fg-muted transition-colors duration-150',
                  'hover:text-fg peer-checked:bg-surface-raised peer-checked:text-fg peer-checked:shadow-raised',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50',
                )}
              >
                {ICON_LABEL[icon]}
              </span>
            </label>
          ))}
        </div>
      </Choices>

      <Choices legend="Colour">
        <div className="flex justify-between">
          {WORKSPACE_COLORS.map((color) => (
            <label key={color} className="cursor-pointer" title={color}>
              <input
                type="radio"
                name={colorGroup}
                aria-label={color}
                className="peer sr-only"
                checked={workspace.color === color}
                onChange={() => set({ color })}
              />
              <span
                className={cn(
                  'block size-5 rounded-full ring-offset-2 ring-offset-surface-overlay transition-[box-shadow,transform] duration-150 ease-out-expo',
                  'hover:scale-110 peer-checked:ring-2 peer-checked:ring-fg/80 peer-focus-visible:ring-2 peer-focus-visible:ring-accent',
                  WORKSPACE_SWATCH[color],
                )}
              />
            </label>
          ))}
        </div>
      </Choices>
    </div>
  );
}
