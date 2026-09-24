import { useId, useState, type ReactNode } from 'react';
import { WORKSPACE_COLORS, type Workspace, type WorkspaceIcon as IconKind, type WorkspacePatch } from '@common/types';
import { cn } from '@/shared/lib';
import { Input } from '@/shared/ui/input';
import { WORKSPACE_SWATCH, WorkspaceIcon, useWorkspaceStore } from '@/entities/workspace';
import { editWorkspace } from '../model/edit';

/** Matches the main process's limit. */
const MAX_NAME = 40;

const ICON_CHOICES: { value: IconKind; label: string }[] = [
  { value: 'favicon', label: 'Site icon' },
  { value: 'color', label: 'Letter' },
];

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
  const favicon = useWorkspaceStore((s) => s.favicons[workspace.id] ?? null);
  // What is typed shows at once; the store and the disk follow each keystroke.
  const [name, setName] = useState(workspace.name);
  const set = (patch: WorkspacePatch) => void editWorkspace(workspace.id, patch);

  return (
    <div className="flex w-[248px] flex-col gap-3" data-testid="workspace-form">
      <div className="flex items-center gap-2.5">
        <WorkspaceIcon workspace={{ ...workspace, name }} favicon={favicon} size="lg" />
        <Input
          autoFocus
          aria-label="Workspace name"
          data-testid="workspace-name"
          value={name}
          maxLength={MAX_NAME}
          placeholder={workspace.host || 'Name this workspace'}
          onChange={(e) => {
            setName(e.target.value);
            set({ name: e.target.value });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) onDone();
          }}
          className="flex-1"
        />
      </div>

      <Choices legend="Icon" hint={workspace.icon === 'favicon' && !favicon ? 'The letter shows until the site has an icon.' : undefined}>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-canvas/60 p-0.5">
          {ICON_CHOICES.map((choice) => (
            <label key={choice.value} className="cursor-pointer">
              <input
                type="radio"
                name={`${id}-icon`}
                className="peer sr-only"
                checked={workspace.icon === choice.value}
                onChange={() => set({ icon: choice.value })}
              />
              <span
                className={cn(
                  'flex h-6 items-center justify-center rounded-md text-[12px] text-fg-muted transition-colors duration-150',
                  'hover:text-fg peer-checked:bg-surface-raised peer-checked:text-fg peer-checked:shadow-raised',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50',
                )}
              >
                {choice.label}
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
                name={`${id}-color`}
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

function Choices({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="label-caps mb-1.5">{legend}</legend>
      {children}
      {hint ? <p className="text-[11.5px] leading-snug text-fg-subtle">{hint}</p> : null}
    </fieldset>
  );
}
