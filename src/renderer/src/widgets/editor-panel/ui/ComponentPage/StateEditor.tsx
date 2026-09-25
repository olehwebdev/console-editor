import { useState, type KeyboardEvent } from 'react';
import type { InspectedState } from '@common/types';
import { KEY } from '@/shared/config';
import { Input } from '@/shared/ui/input';
import { setStateValue } from '@/features/inspect/pick';
import { draftOf } from './draftOf';

/** A state value being set: its new value as JSON, sent on Enter; Esc or leaving the field puts it back as it was. */
export function StateEditor({ value, onDone }: { value: InspectedState; onDone: () => void }) {
  const [draft, setDraft] = useState(() => draftOf(value.preview));
  const [busy, setBusy] = useState(false);

  const onKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEY.escape) onDone();
    if (event.key !== KEY.enter || busy) return;
    setBusy(true);
    if (await setStateValue({ kind: value.kind, name: value.name, json: draft })) onDone();
    else setBusy(false);
  };

  return (
    <Input
      size="sm"
      mono
      autoFocus
      className="min-w-0 flex-1"
      value={draft}
      disabled={busy}
      placeholder='JSON: "text", 42, true, [1, 2], {"key": 1}'
      aria-label={`New value of ${value.name}`}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => void onKeyDown(event)}
      onBlur={() => !busy && onDone()}
      data-testid="state-editor"
    />
  );
}
