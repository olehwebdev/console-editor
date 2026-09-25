import { formatTime } from '@/shared/lib';
import type { ConsoleEntry } from '@common/types';
import { entryText } from '@/entities/console-log';
import { FrameChip } from '@/entities/frame';
import type { FrameInfo } from './types';

/** A divider where a frame loaded a page: rows after it are the new page's. */
export function NavigationRow({ entry, frame }: { entry: ConsoleEntry; frame: FrameInfo | null }) {
  const url = entryText(entry);
  return (
    <div className="flex min-w-0 items-center gap-2 px-2 py-1 text-fg-subtle" data-testid="console-row" data-source={entry.source}>
      <span className="shrink-0 tabular-nums">{formatTime(entry.time)}</span>
      <span className="h-px w-3 shrink-0 bg-line" />
      {frame ? <FrameChip frameKey={frame.key} label={frame.label} title={frame.url} gone={frame.gone} /> : null}
      <span className="shrink-0 font-sans">loaded</span>
      <span className="truncate" title={url}>
        {url}
      </span>
      <span className="h-px min-w-3 flex-1 bg-line" />
    </div>
  );
}
