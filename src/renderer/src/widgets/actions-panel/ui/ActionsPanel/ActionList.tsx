import { useState, type ReactNode } from 'react';
import type { ConsoleAction, ConsoleFrame } from '@common/types';
import { icons } from '@/shared/config';
import { HoverHighlight } from '@/shared/ui/hover-highlight';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { useActionEditor } from '@/features/action/edit';
import { ActionRow } from './ActionRow';
import { NoActions } from './NoActions';

export interface ActionListProps {
  actions: readonly ConsoleAction[];
  frames: readonly ConsoleFrame[];
  names: Readonly<Record<string, string>>;
  /** The action whose form is open (it shows in its place), if any. */
  editingId: string | null;
  /** The open form. */
  form: ReactNode;
}

const { startNew } = useActionEditor.getState();

/** The actions, filtered by a field over their names and code; the one being changed shows as its form. */
export function ActionList({ actions, frames, names, editingId, form }: ActionListProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? actions.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)) : actions;

  if (!actions.length) return form ? null : <NoActions onNew={() => startNew()} />;
  return (
    <>
      {/* Stays in view while the list scrolls under it. */}
      <div className="sticky top-0 z-10 bg-surface px-3 pb-2">
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
      {shown.length ? null : <p className="px-4 py-2 text-[12px] text-fg-subtle">No actions match the filter.</p>}
      <HoverHighlight className="px-1.5" role="list" aria-label="Actions">
        {shown.map((action) =>
          // The action being changed shows as its form, in its place.
          action.id === editingId ? <div key={action.id}>{form}</div> : <ActionRow key={action.id} action={action} frames={frames} names={names} />,
        )}
      </HoverHighlight>
    </>
  );
}
