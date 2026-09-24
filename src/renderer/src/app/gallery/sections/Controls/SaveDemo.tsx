import { useEffect, useRef, useState } from 'react';
import { icons } from '@/shared/config';
import { Button, Swap } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Kbd } from '@/shared/ui/kbd';
import { SHORTCUT, SLOT_ICON_SIZE } from './constants';

const { CheckIcon, SaveIcon } = icons;

const SAVE_STATE = { idle: 'idle', saving: 'saving', saved: 'saved' } as const;
type SaveState = (typeof SAVE_STATE)[keyof typeof SAVE_STATE];

// Both count from the click: the spinner runs until SAVED_AT_MS, "Saved" shows until RESET_AT_MS.
const SAVED_AT_MS = 700;
const RESET_AT_MS = 2100;

// `key` is the leading Swap's value: saving keeps the save glyph, so only "saved" rolls it.
const GLYPH = {
  save: { key: 'save', icon: SaveIcon },
  check: { key: 'check', icon: CheckIcon },
} as const;

interface SaveView {
  label: string;
  glyph: (typeof GLYPH)[keyof typeof GLYPH];
  loading: boolean;
  /** Takes a click and shows the shortcut. */
  ready: boolean;
}

// Record<SaveState, …>: a new state fails typecheck until it has a row here.
const VIEW: Record<SaveState, SaveView> = {
  idle: { label: 'Save override', glyph: GLYPH.save, loading: false, ready: true },
  saving: { label: 'Saving…', glyph: GLYPH.save, loading: true, ready: false },
  saved: { label: 'Saved', glyph: GLYPH.check, loading: false, ready: false },
};

/** Save → spinner → "Saved ✓" → Save, the way the editor's save button behaves. */
export function SaveDemo() {
  const [state, setState] = useState<SaveState>(SAVE_STATE.idle);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const save = () => {
    setState(SAVE_STATE.saving);
    timers.current.push(
      window.setTimeout(() => setState(SAVE_STATE.saved), SAVED_AT_MS),
      window.setTimeout(() => setState(SAVE_STATE.idle), RESET_AT_MS),
    );
  };

  const view = VIEW[state];
  return (
    <Button
      variant="primary"
      loading={view.loading}
      onClick={view.ready ? save : undefined}
      leading={
        <Swap value={view.glyph.key}>
          <Icon icon={view.glyph.icon} size={SLOT_ICON_SIZE.md} />
        </Swap>
      }
      trailing={
        view.ready ? (
          <Kbd
            keys={SHORTCUT.save}
            className="opacity-70 [&_kbd]:border-accent-fg/20 [&_kbd]:bg-transparent [&_kbd]:text-accent-fg"
          />
        ) : null
      }
    >
      <Swap value={state}>{view.label}</Swap>
    </Button>
  );
}
