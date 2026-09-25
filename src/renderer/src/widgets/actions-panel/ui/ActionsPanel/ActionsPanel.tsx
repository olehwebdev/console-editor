import { useState } from 'react';
import { icons } from '@/shared/config';
import { HoverHighlight } from '@/shared/ui/hover-highlight';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { useActionStore } from '@/entities/action';
import { useFrameStore } from '@/entities/frame';
import { useSettingsStore } from '@/entities/settings';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { ActionForm, useActionEditor } from '@/features/action/edit';
import { ActionRow } from './ActionRow';
import { NO_NAMES } from './constants';
import { NoActions } from './NoActions';
import { NotRecording } from './NotRecording';

const { startNew } = useActionEditor.getState();

/**
 * Sidebar view: the workspace's actions, code kept to run in a frame of the
 * page with one click, with the form that makes and changes them.
 */
export function ActionsPanel() {
  const recording = useSettingsStore((s) => s.settings.captureConsole);
  const actions = useActionStore((s) => s.actions);
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const opened = useActionEditor((s) => s.editing);
  const [query, setQuery] = useState('');

  // An action being changed that this workspace doesn't have (another was switched to meanwhile) isn't shown.
  const editing = opened && (opened.id === null || actions.some((a) => a.id === opened.id)) ? opened : null;
  const q = query.trim().toLowerCase();
  const shown = q ? actions.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)) : actions;
  const form = editing ? <ActionForm key={editing.session} editing={editing} frames={frames} names={names} /> : null;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="actions-panel">
      <header className="flex h-10 shrink-0 items-center justify-between pl-4 pr-2">
        <span className="label-caps">Actions</span>
        <IconButton icon={icons.AddIcon} label="New action" size="sm" data-testid="action-new" onClick={() => startNew()} />
      </header>
      {recording ? null : <NotRecording />}
      {actions.length ? (
        <div className="px-3 pb-2">
          <Input
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter actions"
            aria-label="Filter actions"
            leading={<Icon icon={icons.SearchIcon} size={14} className="text-fg-subtle" />}
            trailing={query ? <IconButton icon={icons.CloseIcon} label="Clear filter" size="sm" noTooltip onClick={() => setQuery('')} /> : null}
          />
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {editing?.id === null ? form : null}
        {actions.length || editing ? null : <NoActions onNew={() => startNew()} />}
        {actions.length && !shown.length ? <p className="px-4 py-2 text-[12px] text-fg-subtle">No actions match the filter.</p> : null}
        <HoverHighlight className="px-1.5" role="list" aria-label="Actions">
          {shown.map((action) =>
            // The action being changed shows as its form, in its place.
            action.id === editing?.id ? <div key={action.id}>{form}</div> : <ActionRow key={action.id} action={action} frames={frames} names={names} />,
          )}
        </HoverHighlight>
      </div>
    </div>
  );
}
