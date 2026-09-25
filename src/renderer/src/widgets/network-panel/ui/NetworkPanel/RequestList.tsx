import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { NetworkRequest } from '@common/types';
import { KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { useNetworkSelection } from '../../model';
import { OVERSCAN_ROWS, ROW_HEIGHT, STICK_TO_BOTTOM_PX } from './constants';
import { ListHeader } from './ListHeader';
import { openRequest } from './openRequest';
import { RequestRow } from './RequestRow';
import type { ResolveFrame } from './types';

export interface RequestListProps {
  requests: readonly NetworkRequest[];
  resolve: ResolveFrame;
  /** The details are open beside it: a narrower list (none in a narrow panel), rows without type, size and time. */
  compact: boolean;
}

/** How far each key moves the selection. */
const STEP: Readonly<Record<string, number>> = { [KEY.arrowDown]: 1, [KEY.arrowUp]: -1 };

/**
 * The shown requests, oldest at the top, as a list box (arrows move the selection). Virtualized; it
 * follows new rows while you are at the bottom, and stays put while you read further up.
 */
export function RequestList({ requests, resolve, compact }: RequestListProps) {
  const selectedId = useNetworkSelection((s) => s.selectedId);
  const scroller = useRef<HTMLDivElement>(null);
  /** Whether the list is scrolled to its end; read when rows arrive. */
  const atBottom = useRef(true);
  const virtual = useVirtualizer({
    count: requests.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
    getItemKey: (index) => requests[index]!.id,
  });

  // Keeps the newest row in view (a DOM scroll position) while you are at the bottom.
  useEffect(() => {
    if (atBottom.current && requests.length) virtual.scrollToIndex(requests.length - 1, { align: 'end' });
  }, [requests, virtual]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!Object.hasOwn(STEP, event.key) || !requests.length) return;
    event.preventDefault();
    const at = requests.findIndex((r) => r.id === selectedId);
    const next = Math.min(requests.length - 1, Math.max(0, at === -1 ? requests.length - 1 : at + STEP[event.key]!));
    openRequest(requests[next]!);
    virtual.scrollToIndex(next);
  };

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col font-mono text-[12px] leading-[18px]', compact ? 'hidden w-[38%] max-w-[440px] shrink-0 @min-[44rem]:flex' : 'flex-1')}>
      <ListHeader compact={compact} />
      <div
        ref={scroller}
        role="listbox"
        tabIndex={0}
        aria-label="Requests"
        aria-activedescendant={selectedId && requests.some((r) => r.id === selectedId) ? `network-row-${selectedId}` : undefined}
        data-testid="network-rows"
        onKeyDown={onKeyDown}
        onScroll={(event) => {
          const el = event.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_TO_BOTTOM_PX;
        }}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
      >
        <div className="relative w-full" style={{ height: virtual.getTotalSize() }}>
          {virtual.getVirtualItems().map((item) => {
            const request = requests[item.index]!;
            return (
              <div key={item.key} className="absolute inset-x-0 top-0" style={{ transform: `translateY(${item.start}px)` }}>
                <RequestRow request={request} frame={resolve(request.frameId)} selected={request.id === selectedId} compact={compact} onSelect={() => openRequest(request)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
