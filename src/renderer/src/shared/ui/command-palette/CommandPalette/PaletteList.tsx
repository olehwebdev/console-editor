// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { Virtualizer } from '@tanstack/react-virtual';
import { motion } from 'motion/react';
import type { RefObject } from 'react';
import { cn } from '@/shared/lib';
import { ITEM_H } from './constants';
import { PaletteOption } from './PaletteOption';
import type { Row } from './types';

/** Tracks fast arrow-key repeat without trailing behind the row. */
const HIGHLIGHT_SPRING = { type: 'spring', stiffness: 560, damping: 42, mass: 0.5 } as const;

interface PaletteListProps {
  listRef: RefObject<HTMLDivElement | null>;
  listId: string;
  /** Height of the scroll box while it has options, in px. */
  height: number;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  rows: Row[];
  /** Each row's offset from the top, in px. */
  starts: number[];
  /** How many options the list has. */
  count: number;
  /** The highlighted option's ordinal; -1 for none. */
  current: number;
  /** The highlighted option's row index, if any. */
  activeRow: number | undefined;
  query: string;
  reduce: boolean;
  hasIcons: boolean;
  optionId: (ordinal: number) => string;
  groupId: (group: number) => string;
  onHover: (ordinal: number) => void;
  onRun: (ordinal: number) => void;
}

/** The virtualized result list, with one highlight that glides to the active row. */
export function PaletteList({
  listRef,
  listId,
  height,
  virtualizer,
  rows,
  starts,
  count,
  current,
  activeRow,
  query,
  reduce,
  hasIcons,
  optionId,
  groupId,
  onHover,
  onRun,
}: PaletteListProps) {
  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label="Commands"
      className={cn('overflow-y-auto overscroll-contain', count === 0 && 'hidden')}
      style={{ height: count === 0 ? 0 : height }}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {activeRow !== undefined ? (
          <motion.div
            // Re-keyed per query: a new result list snaps the highlight instead of gliding.
            key={query}
            aria-hidden
            initial={false}
            animate={{ y: starts[activeRow] }}
            transition={reduce ? { duration: 0 } : HIGHLIGHT_SPRING}
            className="pointer-events-none absolute inset-x-1.5 top-0 rounded-lg bg-pressed"
            style={{ height: ITEM_H }}
          />
        ) : null}
        {virtualizer.getVirtualItems().map((virtual) => {
          const row = rows[virtual.index];
          if (!row) return null;
          const style = { height: virtual.size, transform: `translateY(${virtual.start}px)` };
          if (row.kind === 'heading') {
            return (
              <div key={virtual.key} role="presentation" className="label-caps absolute inset-x-1.5 top-0 flex items-end px-2.5 pb-1.5" style={style}>
                {row.heading}
              </div>
            );
          }
          return (
            <PaletteOption
              key={virtual.key}
              row={row}
              style={style}
              isActive={row.ordinal === current}
              count={count}
              hasIcons={hasIcons}
              id={optionId(row.ordinal)}
              describedBy={groupId(row.group)}
              onHover={onHover}
              onRun={onRun}
            />
          );
        })}
      </div>
    </div>
  );
}
