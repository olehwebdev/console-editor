import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import type { ConsoleEntry } from '@common/types';
import { EntryRow } from './EntryRow';
import { OVERSCAN_ROWS, ROW_ESTIMATE, STICK_TO_BOTTOM_PX } from './constants';
import type { ResolveFrame, SaveAsAction } from './types';

export interface EntryListProps {
  entries: readonly ConsoleEntry[];
  resolve: ResolveFrame;
  /** When the code run before each row ran, by row id (`sinceInput`). */
  since: ReadonlyMap<number, number>;
  onSaveAsAction: SaveAsAction;
}

/**
 * The shown rows, oldest at the top. Virtualized (rows are measured, since
 * values and stacks open in place); it follows new rows while you are at the
 * bottom, and stays put while you read further up.
 */
export function EntryList({ entries, resolve, since, onSaveAsAction }: EntryListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  /** Whether the list is scrolled to its end; read when rows arrive. */
  const atBottom = useRef(true);
  const virtual = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: OVERSCAN_ROWS,
    getItemKey: (index) => entries[index]!.id,
  });

  // Keeps the newest row in view (a DOM scroll position) while you are at the bottom.
  useEffect(() => {
    if (atBottom.current && entries.length) virtual.scrollToIndex(entries.length - 1, { align: 'end' });
  }, [entries, virtual]);

  return (
    <div
      ref={scroller}
      data-testid="console-rows"
      role="log"
      aria-label="Console output"
      onScroll={(event) => {
        const el = event.currentTarget;
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_TO_BOTTOM_PX;
      }}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden font-mono text-[12px] leading-[18px]"
    >
      <div className="relative w-full" style={{ height: virtual.getTotalSize() }}>
        {virtual.getVirtualItems().map((item) => {
          const entry = entries[item.index]!;
          return (
            <div key={item.key} ref={virtual.measureElement} data-index={item.index} className="absolute inset-x-0 top-0" style={{ transform: `translateY(${item.start}px)` }}>
              <EntryRow entry={entry} frame={resolve(entry.frameId)} since={since.get(entry.id) ?? null} onSaveAsAction={onSaveAsAction} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
