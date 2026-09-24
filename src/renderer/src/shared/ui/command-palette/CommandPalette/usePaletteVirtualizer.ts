// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import { useCallback, type RefObject } from 'react';
import { HEADING_H, ITEM_H, LIST_PAD } from './constants';
import type { Row } from './types';

/** Rows rendered beyond the visible ones, each way. */
const OVERSCAN = 6;

/** Virtualizes the result list: headings and items at their own heights, the active row always rendered. */
export function usePaletteVirtualizer(rows: Row[], activeRow: number | undefined, listRef: RefObject<HTMLDivElement | null>) {
  const getItemKey = useCallback((index: number) => rows[index]?.key ?? index, [rows]);
  // The active option always stays in the DOM, so `aria-activedescendant` never points at nothing
  // (e.g. after wheel-scrolling away from it).
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      if (activeRow === undefined || indexes.includes(activeRow)) return indexes;
      return [...indexes, activeRow].sort((a, b) => a - b);
    },
    [activeRow],
  );
  return useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'heading' ? HEADING_H : ITEM_H),
    getItemKey,
    rangeExtractor,
    overscan: OVERSCAN,
    paddingStart: LIST_PAD,
    paddingEnd: LIST_PAD,
    useFlushSync: false,
  });
}
