import { useState } from 'react';
import type { ConsoleEntry } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { FrameChip } from '@/entities/frame';
import { LEVEL_ROW, SOURCE_MARK } from './constants';
import { formatTime } from './formatTime';
import { NavigationRow } from './NavigationRow';
import { SaveActionButton } from './SaveActionButton';
import { SourceLink } from './SourceLink';
import { StackView } from './StackView';
import type { FrameInfo, SaveAsAction } from './types';
import { ValueView } from './ValueView';

export interface EntryRowProps {
  entry: ConsoleEntry;
  frame: FrameInfo | null;
  /** When the last code you ran before this row ran (null if none): the row shows how long after it came. */
  since: number | null;
  onSaveAsAction: SaveAsAction;
}

/** One console row: when, which frame, what, and where from; errors and warnings tinted, a stack on request. */
export function EntryRow({ entry, frame, since, onSaveAsAction }: EntryRowProps) {
  const [stackOpen, setStackOpen] = useState(false);
  if (entry.source === 'navigation') return <NavigationRow entry={entry} frame={frame} />;
  const mark = SOURCE_MARK[entry.source];
  const { stack, location } = entry;

  return (
    <div
      data-testid="console-row"
      data-source={entry.source}
      data-level={entry.level}
      className={cn('group flex min-w-0 flex-col border-b border-line/60 px-2 py-[3px]', LEVEL_ROW[entry.level])}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span className="shrink-0 tabular-nums text-fg-subtle" title={since === null ? undefined : 'Since the code you last ran'}>
          {formatTime(entry.time)}
          {since === null ? null : <span className="ml-1.5 inline-block min-w-[52px] text-fg-subtle/80">+{Math.max(0, Math.round(entry.time - since))}ms</span>}
        </span>
        {frame ? <FrameChip frameKey={frame.key} label={frame.label} title={frame.url} gone={frame.gone} className="mt-px" /> : null}
        {mark ? <span className="shrink-0 text-fg-subtle">{mark}</span> : null}
        {stack ? (
          <button
            type="button"
            aria-expanded={stackOpen}
            aria-label={stackOpen ? 'Hide the stack' : 'Show the stack'}
            onClick={() => setStackOpen(!stackOpen)}
            className="mt-[3px] shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Icon icon={icons.ChevronRightIcon} size={12} className={cn('transition-transform duration-150', stackOpen && 'rotate-90')} />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-2 select-text">
          {entry.values.map((value, index) => (
            // A row's values never change or reorder.
            <ValueView key={index} value={value} />
          ))}
        </div>
        {location ? <SourceLink location={location} /> : null}
        {entry.source === 'input' ? <SaveActionButton entry={entry} onSave={onSaveAsAction} /> : null}
      </div>
      {stack && stackOpen ? <StackView stack={stack} /> : null}
    </div>
  );
}
