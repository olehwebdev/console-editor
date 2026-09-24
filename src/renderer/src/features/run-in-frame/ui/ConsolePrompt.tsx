import { useState, type KeyboardEvent } from 'react';
import { KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { useWorkspaceStore } from '@/entities/workspace';
import { historyOf } from '../model/historyOf';
import { runInFrame } from '../model/runInFrame';

/** The prompt grows with the code up to this many lines, then scrolls. */
const MAX_LINES = 8;
/** Where lines of code break. */
const NEWLINE = '\n';
/** The prompt's keys, on hover. */
const KEYS_HINT = 'Enter runs the code · Shift+Enter adds a line · ↑ and ↓ go through what you ran before';

export interface ConsolePromptProps {
  /** Where the code runs; null: nowhere yet (the prompt is disabled). */
  frameId: string | null;
  placeholder: string;
  className?: string;
}

/**
 * The console's input. Enter runs the code in the picked frame, Shift+Enter
 * adds a line, and Up and Down walk the code run before in this workspace (from
 * the first and last line, so moving within code of several lines still works).
 */
export function ConsolePrompt({ frameId, placeholder, className }: ConsolePromptProps) {
  const workspaceId = useWorkspaceStore((s) => s.activeId);
  const [value, setValue] = useState('');
  /** The history entry shown, and what was being typed before walking into it. */
  const [walk, setWalk] = useState<{ index: number; draft: string } | null>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    const field = event.currentTarget;
    if (event.key === KEY.enter && !event.shiftKey) {
      event.preventDefault();
      if (!frameId || !value.trim()) return;
      setValue('');
      setWalk(null);
      void runInFrame(frameId, value);
      return;
    }
    const collapsed = field.selectionStart === field.selectionEnd;
    const history = workspaceId ? historyOf(workspaceId) : [];
    if (event.key === KEY.arrowUp && collapsed && !value.slice(0, field.selectionStart).includes(NEWLINE) && history.length) {
      event.preventDefault();
      const index = walk && walk.index <= history.length ? Math.max(0, walk.index - 1) : history.length - 1;
      setWalk({ index, draft: walk?.draft ?? value });
      setValue(history[index]!);
      return;
    }
    if (event.key === KEY.arrowDown && collapsed && walk && !value.slice(field.selectionEnd).includes(NEWLINE)) {
      event.preventDefault();
      const index = walk.index + 1;
      setWalk(index < history.length ? { index, draft: walk.draft } : null);
      setValue(index < history.length ? history[index]! : walk.draft);
    }
  };

  return (
    <textarea
      data-testid="console-prompt"
      aria-label="Code to run in the picked frame"
      title={KEYS_HINT}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      disabled={!frameId}
      rows={Math.min(MAX_LINES, value.split(NEWLINE).length)}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        setValue(e.target.value);
        setWalk(null);
      }}
      onKeyDown={onKeyDown}
      className={cn(
        'min-w-0 flex-1 resize-none bg-transparent py-1.5 font-mono text-[12px] leading-5 text-fg outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed',
        className,
      )}
    />
  );
}
