// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { SearchIcon } from '@/shared/config/icons';
import { cn, DURATION, EASE_OUT, SPRING_PANEL, useRegisterOverlay } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { Kbd } from '@/shared/ui/kbd';
import { HEADING_H, ITEM_H, LIST_PAD } from './constants';
import { filterGroups } from './filterGroups';
import { Highlighted } from './Highlighted';
import { layoutRows } from './layoutRows';
import { PALETTE_KEY_HANDLERS } from './paletteKeyHandlers';
import type { CommandPaletteProps, Direction, PaletteKeyActions } from './types';

/** The panel drops in from a little smaller and higher, and lifts slightly as it goes. */
const ENTER_FROM = { scale: 0.97, y: -8 } as const;
const EXIT_TO = { scale: 0.98, y: -4 } as const;

const MAX_LIST_H = 360;
const PAGE_STEP = 8;
/** Rows rendered beyond the visible ones, each way. */
const OVERSCAN = 6;
/** Tracks fast arrow-key repeat without trailing behind the row. */
const HIGHLIGHT_SPRING = { type: 'spring', stiffness: 560, damping: 42, mass: 0.5 } as const;

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
  // Whatever had focus before the palette opened gets it back on close.
  const [restoreTo] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const sections = useMemo(() => filterGroups(groups, query), [groups, query]);
  const { rows, starts, itemRows, total } = useMemo(() => layoutRows(sections), [sections]);
  const count = itemRows.length;
  const current = count > 0 ? Math.min(active, count - 1) : -1;
  const activeRow = current >= 0 ? itemRows[current] : undefined;

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
  const virtualizer = useVirtualizer({
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

  const restoreFocus = useCallback(() => {
    if (restoreTo && restoreTo !== document.body && restoreTo.isConnected) restoreTo.focus({ preventScroll: true });
    else inputRef.current?.blur();
  }, [restoreTo]);

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

  // Closed from outside (hotkey toggle, parent state): hand focus back if it is still ours.
  useEffect(() => {
    if (isPresent) return;
    const focused = document.activeElement;
    if (!focused || focused === document.body || panelRef.current?.contains(focused)) restoreFocus();
  }, [isPresent, restoreFocus]);

  const reveal = (ordinal: number, direction: Direction) => {
    const row = itemRows[ordinal];
    if (row === undefined) return;
    // Moving up onto a group's first row brings its heading along.
    const target = ordinal === 0 ? 0 : direction === -1 && rows[row - 1]?.kind === 'heading' ? row - 1 : row;
    virtualizer.scrollToIndex(target, { align: 'auto' });
  };

  const moveTo = (ordinal: number, direction: Direction) => {
    setActive(ordinal);
    reveal(ordinal, direction);
  };

  const keyActions: PaletteKeyActions = {
    step: (direction) => {
      if (count === 0) return;
      moveTo((current + direction + count) % count, direction);
    },
    page: (direction) => {
      if (count === 0) return;
      moveTo(Math.min(Math.max(current + direction * PAGE_STEP, 0), count - 1), direction);
    },
    runActive: () => {
      if (current >= 0) run(current);
    },
    close,
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || !Object.hasOwn(PALETTE_KEY_HANDLERS, event.key)) return;
    PALETTE_KEY_HANDLERS[event.key](event, keyActions);
  };

  // Clicks on rows, headings or chrome keep the caret in the input.
  const keepInputFocus = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== inputRef.current) event.preventDefault();
  };

  const hasIcons = useMemo(() => groups.some((group) => group.items.some((item) => item.icon)), [groups]);
  const listHeight = Math.min(total, MAX_LIST_H);

  return (
    <div className={cn('fixed inset-0 z-[900]', !isPresent && 'pointer-events-none')}>
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: DURATION.short3, ease: EASE_OUT } }}
        transition={{ duration: DURATION.medium1, ease: EASE_OUT }}
        onClick={close}
        className="absolute inset-0 bg-scrim"
      />
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
          <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
            <Icon icon={SearchIcon} size={16} className="text-fg-subtle" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
                virtualizer.scrollToOffset(0);
              }}
              placeholder={placeholder}
              spellCheck={false}
              autoComplete="off"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={current >= 0 ? optionId(current) : undefined}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Commands"
            className={cn('overflow-y-auto overscroll-contain', count === 0 && 'hidden')}
            style={{ height: count === 0 ? 0 : listHeight }}
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
                const { item, indices } = row.result;
                const isActive = row.ordinal === current;
                return (
                  <div
                    key={virtual.key}
                    id={optionId(row.ordinal)}
                    role="option"
                    aria-selected={isActive}
                    // Only a window of rows is in the DOM: give the real count and position, and the group name.
                    aria-setsize={count}
                    aria-posinset={row.ordinal + 1}
                    aria-describedby={groupId(row.group)}
                    onPointerMove={() => {
                      if (!isActive) setActive(row.ordinal);
                    }}
                    onClick={() => run(row.ordinal)}
                    className="absolute inset-x-1.5 top-0 flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5"
                    style={style}
                  >
                    {item.icon ? (
                      <Icon icon={item.icon} size={16} className={cn('transition-colors duration-100', isActive ? 'text-fg' : 'text-fg-muted')} />
                    ) : hasIcons ? (
                      <span className="size-4 shrink-0" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-fg">
                      <Highlighted text={item.label} indices={indices} />
                    </span>
                    {item.hint ? <span className="max-w-[45%] shrink-0 truncate text-xs text-fg-subtle">{item.hint}</span> : null}
                    {item.shortcut?.length ? <Kbd keys={item.shortcut} className="shrink-0" /> : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group names for the options' descriptions; the visible headings may be virtualized away. */}
          <div hidden>
            {sections.map((section, group) => (
              <span key={group} id={groupId(group)}>
                {section.heading}
              </span>
            ))}
          </div>

          {count === 0 ? <div className="px-4 py-8 text-center text-fg-subtle">{emptyMessage}</div> : null}

          <div className="flex h-8 items-center gap-4 border-t border-line px-3 text-[11px] text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys={['↑', '↓']} /> Navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys={['enter']} /> Run
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <Kbd keys={['Esc']} /> Close
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
