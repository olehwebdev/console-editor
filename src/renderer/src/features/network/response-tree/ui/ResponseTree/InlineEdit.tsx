import { useRef, useState, type KeyboardEvent } from 'react';
import { KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { TREE_SELECTOR } from './constants';

export interface InlineEditProps {
  initial: string;
  label: string;
  /** What is wrong with the text as typed, or null when it can be written. */
  check(text: string): string | null;
  onCommit(text: string): void;
  onCancel(): void;
  /** The part of `initial` to select at first (a string's inside, between its quotes). */
  select?: readonly [number, number];
  className?: string;
}

/** A field over a key or value in the tree: Enter or leaving it writes it (when it can be), Esc leaves it as it was. */
export function InlineEdit({ initial, label, check, onCommit, onCancel, select, className }: InlineEditProps) {
  const [text, setText] = useState(initial);
  /** Written or dropped already: the blur that follows (focus going back to the tree) must not write it again. */
  const finished = useRef(false);
  const problem = check(text);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // The tree's own keys (arrows, Delete) don't apply while typing.
    event.stopPropagation();
    const done = (finish: () => void) => {
      // Back to the tree, to go on with the keyboard: the field goes away with the edit.
      const tree = event.currentTarget.closest<HTMLElement>(TREE_SELECTOR);
      finished.current = true;
      finish();
      tree?.focus({ preventScroll: true });
    };
    if (event.key === KEY.enter && !event.nativeEvent.isComposing && !problem) done(() => onCommit(text));
    if (event.key === KEY.escape) done(onCancel);
  };
  return (
    <input
      autoFocus
      value={text}
      aria-label={label}
      aria-invalid={!!problem}
      title={problem ?? undefined}
      spellCheck={false}
      data-testid="tree-edit"
      onFocus={(e) => select && e.currentTarget.setSelectionRange(select[0], select[1])}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => {
        if (finished.current) return;
        finished.current = true;
        if (problem) onCancel();
        else onCommit(text);
      }}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'h-5 min-w-16 flex-1 rounded-sm border bg-surface px-1 font-mono text-[12px] text-fg outline-none',
        problem ? 'border-danger/60' : 'border-accent/50',
        className,
      )}
    />
  );
}
