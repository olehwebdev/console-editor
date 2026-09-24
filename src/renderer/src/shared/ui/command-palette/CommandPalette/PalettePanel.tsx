// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { cn, DURATION, EASE_OUT, SPRING_PANEL, useRegisterOverlay } from '@/shared/lib';
import { createPaletteKeyActions } from './createPaletteKeyActions';
import { filterGroups } from './filterGroups';
import { GroupNames } from './GroupNames';
import { layoutRows } from './layoutRows';
import { PaletteBackdrop } from './PaletteBackdrop';
import { PaletteFooter } from './PaletteFooter';
import { PALETTE_KEY_HANDLERS } from './paletteKeyHandlers';
import { PaletteList } from './PaletteList';
import { PaletteSearch } from './PaletteSearch';
import type { CommandPaletteProps, Direction } from './types';
import { usePaletteVirtualizer } from './usePaletteVirtualizer';
import { useRestoreFocus } from './useRestoreFocus';

/** The panel drops in from a little smaller and higher, and lifts slightly as it goes. */
const ENTER_FROM = { scale: 0.97, y: -8 } as const;
const EXIT_TO = { scale: 0.98, y: -4 } as const;

const MAX_LIST_H = 360;

export function PalettePanel({
  onOpenChange,
  groups,
  placeholder = 'Type a command or search…',
  emptyMessage = 'No matching commands',
  className,
}: Omit<CommandPaletteProps, 'open'>) {
  useRegisterOverlay(true);
  const isPresent = useIsPresent();
  const reduce = useReducedMotion() ?? false;
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (ordinal: number) => `${uid}-opt-${ordinal}`;
  const groupId = (group: number) => `${uid}-group-${group}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const sections = useMemo(() => filterGroups(groups, query), [groups, query]);
  const { rows, starts, itemRows, total } = useMemo(() => layoutRows(sections), [sections]);
  const count = itemRows.length;
  const current = count > 0 ? Math.min(active, count - 1) : -1;
  const activeRow = current >= 0 ? itemRows[current] : undefined;
  const virtualizer = usePaletteVirtualizer(rows, activeRow, listRef);
  const restoreFocus = useRestoreFocus(isPresent, panelRef, inputRef);

  const close = () => {
    if (!isPresent) return;
    restoreFocus();
    onOpenChange(false);
  };

  const run = (ordinal: number) => {
    const row = rows[itemRows[ordinal] ?? -1];
    if (!row || row.kind !== 'item' || !isPresent) return;
    close();
    row.result.item.onSelect();
  };

  const moveTo = (ordinal: number, direction: Direction) => {
    setActive(ordinal);
    const row = itemRows[ordinal];
    if (row === undefined) return;
    // Moving up onto a group's first row brings its heading along.
    const target = ordinal === 0 ? 0 : direction === -1 && rows[row - 1]?.kind === 'heading' ? row - 1 : row;
    virtualizer.scrollToIndex(target, { align: 'auto' });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || !Object.hasOwn(PALETTE_KEY_HANDLERS, event.key)) return;
    PALETTE_KEY_HANDLERS[event.key](event, createPaletteKeyActions({ count, current, moveTo, run, close }));
  };

  // Clicks on rows, headings or chrome keep the caret in the input.
  const keepInputFocus = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== inputRef.current) event.preventDefault();
  };

  const hasIcons = useMemo(() => groups.some((group) => group.items.some((item) => item.icon)), [groups]);

  return (
    <div className={cn('fixed inset-0 z-[900]', !isPresent && 'pointer-events-none')}>
      <PaletteBackdrop onClose={close} />
      <div className="pointer-events-none absolute inset-x-4 top-[max(56px,12vh)] flex justify-center">
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          inert={!isPresent}
          initial={{ opacity: 0, scale: reduce ? 1 : ENTER_FROM.scale, y: reduce ? 0 : ENTER_FROM.y }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: reduce ? 1 : EXIT_TO.scale, y: reduce ? 0 : EXIT_TO.y, transition: { duration: DURATION.short3, ease: EASE_OUT } }}
          transition={reduce ? { duration: DURATION.short2 } : { default: SPRING_PANEL, opacity: { duration: DURATION.short4, ease: EASE_OUT } }}
          onKeyDown={onKeyDown}
          onMouseDown={keepInputFocus}
          className={cn(
            'pointer-events-auto w-full max-w-[580px] origin-top overflow-hidden rounded-2xl bg-surface-overlay text-[13px] text-fg shadow-overlay backdrop-blur-xl will-change-transform',
            className,
          )}
        >
          <PaletteSearch
            inputRef={inputRef}
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              setActive(0);
              virtualizer.scrollToOffset(0);
            }}
            placeholder={placeholder}
            listId={listId}
            activeDescendant={current >= 0 ? optionId(current) : undefined}
          />
          <PaletteList
            listRef={listRef}
            listId={listId}
            height={Math.min(total, MAX_LIST_H)}
            virtualizer={virtualizer}
            rows={rows}
            starts={starts}
            count={count}
            current={current}
            activeRow={activeRow}
            query={query}
            reduce={reduce}
            hasIcons={hasIcons}
            optionId={optionId}
            groupId={groupId}
            onHover={setActive}
            onRun={run}
          />
          <GroupNames sections={sections} groupId={groupId} />
          {count === 0 ? <div className="px-4 py-8 text-center text-fg-subtle">{emptyMessage}</div> : null}
          <PaletteFooter />
        </motion.div>
      </div>
    </div>
  );
}
