import type { ReactNode } from 'react';
import { SHORTCUT } from '@common/constants';
import type { ConsoleFrame } from '@common/types';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { clearConsole } from '@/features/clear-console';
import { useConsoleFilter } from '@/features/filter-console';
import { FrameFilterBar } from './FrameFilterBar';
import { LevelMenu } from './LevelMenu';
import type { ProblemCount } from './problemCounts';

export interface ConsoleToolbarProps {
  frames: readonly ConsoleFrame[];
  labels: ReadonlyMap<string, string>;
  counts: ReadonlyMap<string, ProblemCount>;
  onCopy(): void;
  onClose(): void;
  /** In the title's place (the panel's tabs); else "Console". */
  title?: ReactNode;
}

const { setText, togglePreserveLog } = useConsoleFilter.getState();

/** The console's header: frame filters, levels, text filter, and its actions. */
export function ConsoleToolbar({ frames, labels, counts, onCopy, onClose, title }: ConsoleToolbarProps) {
  const text = useConsoleFilter((s) => s.text);
  const preserveLog = useConsoleFilter((s) => s.preserveLog);
  return (
    <div className="flex shrink-0 flex-col border-b border-line">
      <div className="flex h-9 items-center gap-1.5 px-2">
        <div className="min-w-0 flex-1 truncate">{title ?? <span className="label-caps">Console</span>}</div>
        <LevelMenu />
        <Input
          size="sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Filter"
          aria-label="Filter rows"
          leading={<Icon icon={icons.FilterIcon} size={12} className="text-fg-subtle" />}
          className="w-32 shrink"
        />
        <IconButton icon={icons.PinIcon} label="Keep rows when the page loads another page" size="sm" active={preserveLog} aria-pressed={preserveLog} onClick={togglePreserveLog} />
        <IconButton icon={icons.CopyIcon} label="Copy the rows shown" size="sm" onClick={onCopy} />
        <IconButton icon={icons.DeleteIcon} label="Clear the console" size="sm" data-testid="console-clear" onClick={clearConsole} />
        <IconButton icon={icons.CloseIcon} label="Close the console" size="sm" shortcut={SHORTCUT.console} onClick={onClose} />
      </div>
      <FrameFilterBar frames={frames} labels={labels} counts={counts} />
    </div>
  );
}
