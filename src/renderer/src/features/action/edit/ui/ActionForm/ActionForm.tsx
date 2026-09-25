import { useState } from 'react';
import { MAX_ACTION_NAME } from '@common/constants';
import type { ActionInput, ConsoleFrame } from '@common/types';
import { KEY } from '@/shared/config';
import { clamp } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { frameKey } from '@/entities/frame';
import { saveAction } from '../../model/saveAction';
import type { ActionEditing } from '../../model/types';
import { useActionEditor } from '../../model/useActionEditor';
import { closeOnEscape } from './closeOnEscape';
import { CODE_ROWS, NEWLINE } from './constants';
import { TargetPicker } from './TargetPicker';

export interface ActionFormProps {
  /** Give it `key={editing.session}`: it starts from what it opens with. */
  editing: ActionEditing;
  frames: readonly ConsoleFrame[];
  names: Readonly<Record<string, string>>;
}

const { close } = useActionEditor.getState();

/**
 * A new action, or one being changed: its name, the frame it runs in and its
 * code. Enter in the name or Ctrl/Cmd+Enter in the code saves it; Esc cancels.
 */
export function ActionForm({ editing, frames, names }: ActionFormProps) {
  const [draft, setDraft] = useState<ActionInput>(editing.start);
  const [saving, setSaving] = useState(false);
  const change = (patch: Partial<ActionInput>) => setDraft((d) => ({ ...d, ...patch }));
  const ready = !!draft.name.trim() && !!draft.code.trim();

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    // Saved, the form closes; otherwise it stays, to try again.
    if (!(await saveAction(editing.id, draft))) setSaving(false);
  };

  return (
    <form
      data-testid="action-form"
      aria-label={editing.id ? 'Edit action' : 'New action'}
      className="mx-1.5 mb-2 flex flex-col gap-2 rounded-lg border border-line bg-surface-editor p-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Input
        autoFocus
        aria-label="Action name"
        data-testid="action-name"
        value={draft.name}
        maxLength={MAX_ACTION_NAME}
        placeholder="Add an item to the cart"
        onChange={(event) => change({ name: event.target.value })}
        onKeyDown={closeOnEscape}
      />
      <div className="flex min-w-0 items-center gap-1 text-[12px] text-fg-subtle">
        <span className="shrink-0">Runs in</span>
        <TargetPicker
          frames={frames}
          names={names}
          target={draft.target}
          targetName={draft.targetName}
          onPick={(frame) => change({ target: frameKey(frame), targetName: frame.parentId ? frame.name : '' })}
        />
      </div>
      <textarea
        aria-label="Code to run"
        data-testid="action-code"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={draft.code}
        rows={clamp(draft.code.split(NEWLINE).length, CODE_ROWS.min, CODE_ROWS.max)}
        placeholder="addItem('A1')"
        onChange={(event) => change({ code: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === KEY.enter && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void submit();
          } else closeOnEscape(event);
        }}
        className="min-w-0 resize-none rounded-lg border border-line bg-surface-raised px-2 py-1.5 font-mono text-[12px] leading-5 text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent/60 focus:ring-2 focus:ring-accent/40"
      />
      <p className="text-[11.5px] leading-snug text-fg-subtle">
        It runs inside that frame, cross-site ones too: call <code className="font-mono text-fg-muted">addItem('A1')</code> rather than reaching it through{' '}
        <code className="font-mono text-fg-muted">window.top.frames</code>, which a cross-site frame refuses.
      </p>
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit" disabled={!ready} loading={saving} data-testid="action-save">
          Save
        </Button>
      </div>
    </form>
  );
}
