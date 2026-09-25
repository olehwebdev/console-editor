import { useState } from 'react';
import type { InspectedState, InspectedValue } from '@common/types';
import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { hookName } from '@/entities/inspector';
import { STATE_KIND_LABEL } from './constants';
import { StateEditor } from './StateEditor';
import { CodeLink } from '@/features/open-resource';

/** One prop or state value: its name, its value as the page previewed it, and where a function is defined; a settable state value can be set in place. */
export function ValueRow({ value, hookNames }: { value: InspectedValue | InspectedState; hookNames?: ReadonlyArray<string | null> }) {
  const [editing, setEditing] = useState(false);
  const name = hookName(value.name, hookNames);
  const state = 'kind' in value ? value : null;
  return (
    <div className="group flex min-h-7 min-w-0 items-center gap-3 px-3.5 py-0.5 text-[12.5px]" data-testid="component-value" data-name={name}>
      <span className="w-32 shrink-0 truncate font-mono text-fg-muted">{name}</span>
      {state ? <Badge>{STATE_KIND_LABEL[state.kind]}</Badge> : null}
      {state && editing ? (
        <StateEditor value={state} label={name} onDone={() => setEditing(false)} />
      ) : (
        <span className="min-w-0 flex-1 truncate font-mono text-fg">{value.preview}</span>
      )}
      {state?.editable && !editing ? (
        <IconButton icon={icons.EditIcon} label={`Set ${name}`} size="sm" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => setEditing(true)} data-testid="edit-state" />
      ) : null}
      <CodeLink location={value.location} />
    </div>
  );
}
