import { useActionStore } from '@/entities/action';
import { useFrameStore } from '@/entities/frame';
import { useSettingsStore } from '@/entities/settings';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { ActionForm, useActionEditor } from '@/features/action/edit';
import { ActionList } from './ActionList';
import { NO_NAMES } from './constants';
import { DetachedNotice } from './DetachedNotice';
import { NotRecording } from './NotRecording';
import { PanelHeader } from './PanelHeader';
import type { ActionsPlacement } from './types';

export interface ActionsPanelProps {
  /** The editor's sidebar (the default), or the Actions window. */
  placement?: ActionsPlacement;
}

/**
 * The workspace's actions, code kept to run in a frame of the page with one
 * click, with the form that makes and changes them. It sits in the sidebar or
 * in a window of its own; while it is in its window, the sidebar says so (and
 * still shows a form opened there, from the console or the palette).
 */
export function ActionsPanel({ placement = 'sidebar' }: ActionsPanelProps) {
  const recording = useSettingsStore((s) => s.settings.captureConsole);
  const actions = useActionStore((s) => s.actions);
  const away = useActionStore((s) => placement === 'sidebar' && s.window.detached);
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const opened = useActionEditor((s) => s.editing);

  // An action being changed that this workspace doesn't have (another was switched to meanwhile) isn't shown.
  const editing = opened && (opened.id === null || actions.some((a) => a.id === opened.id)) ? opened : null;
  const form = editing ? <ActionForm key={editing.session} editing={editing} frames={frames} names={names} /> : null;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="actions-panel" data-placement={placement}>
      <PanelHeader placement={placement} />
      {away ? <DetachedNotice /> : null}
      {recording ? null : <NotRecording />}
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {editing?.id === null ? form : null}
        {away ? null : <ActionList actions={actions} frames={frames} names={names} editingId={editing?.id ?? null} form={form} />}
      </div>
    </div>
  );
}
