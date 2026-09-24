// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type WheelEvent,
} from 'react';
import { KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { EXITING_ATTR, TAB_ID_ATTR } from './constants';
import { EditorTab } from './EditorTab';
import { TAB_KEY_HANDLERS } from './tabKeyHandlers';
import type { DropSide, EditorTabsProps } from './types';

/**
 * Private drag payload. Never `text/plain`: Monaco's drop-into-editor and every
 * text input accept plain text, so releasing a tab over them would insert its id.
 */
const TAB_MIME = 'application/x-console-editor-tab';

/** The strip's tabs that keyboard navigation moves between: not the ones closing. */
const LIVE_TABS = `[role="tab"]:not([${EXITING_ATTR}])`;

/** Alt+Shift+←/→ moves the focused tab one place, before its left or after its right neighbour. */
const REORDER_KEYS: Record<string, { offset: 1 | -1; side: DropSide }> = {
  [KEY.arrowLeft]: { offset: -1, side: 'before' },
  [KEY.arrowRight]: { offset: 1, side: 'after' },
};

/** Scrolls smaller than this (px) aren't worth making. */
const MIN_SCROLL = 0.5;
/** Pixels per line, for wheels that scroll by lines. */
const LINE_HEIGHT = 16;

/**
 * Pill-style editor tabs. The active tab is raised (bg-surface-raised +
 * shadow-raised) and its pill glides between tabs with a shared layout;
 * tabs grow in / shrink out as they open and close. Dirty tabs show a dot
 * that swaps with the close button on hover; middle click closes; the strip
 * scrolls horizontally with the wheel. Clicking a tab selects it without
 * taking focus from the editor. Keys: ←/→/Home/End move focus, Enter/Space
 * select, Delete (and Backspace on macOS) close, Alt+Shift+←/→ reorder.
 */
export function EditorTabs({
  items,
  activeId,
  onSelect,
  onClose,
  onReorder,
  renderLabel,
  trailing,
  onTabContextMenu,
  onTabDoubleClick,
  label = 'Open files',
  className,
  onPointerDown,
  ...rest
}: EditorTabsProps) {
  const reduce = useReducedMotion() ?? false;
  const pillId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ closing: string; next: string | null } | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [drag, setDrag] = useState<{ id: string; over: string | null; side: DropSide } | null>(null);

  const activeIndex = items.findIndex((item) => item.id === activeId);

  const tabById = useCallback((id: string | null | undefined): HTMLElement | null => {
    if (!id) return null;
    return scrollerRef.current?.querySelector<HTMLElement>(`[${TAB_ID_ATTR}="${CSS.escape(id)}"]`) ?? null;
  }, []);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next = { left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 };
    setEdges((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
  }, []);

  /** Scrolls only the strip (never ancestors) so `el` is fully visible, clear of the edge fades. */
  const reveal = useCallback(
    (el: HTMLElement | null) => {
      const scroller = scrollerRef.current;
      if (!scroller || !el) return;
      const frame = scroller.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const pad = 20;
      const delta =
        box.left < frame.left + pad ? box.left - frame.left - pad : box.right > frame.right - pad ? box.right - frame.right + pad : 0;
      if (Math.abs(delta) > MIN_SCROLL) scroller.scrollBy({ left: delta, behavior: reduce ? 'instant' : 'smooth' });
    },
    [reduce],
  );

  useLayoutEffect(() => {
    reveal(tabById(activeId));
  }, [activeId, reveal, tabById]);

  // After a keyboard close, focus the neighbour once the closed tab is gone.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (pending && !items.some((item) => item.id === pending.closing)) {
      pendingFocus.current = null;
      (tabById(pending.next) ?? tabById(activeId))?.focus();
    }
    updateEdges();
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    el.addEventListener('scroll', updateEdges, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', updateEdges);
    };
  }, [updateEdges]);

  const reorder = useCallback(
    (id: string, target: string, side: DropSide) => {
      if (!onReorder || id === target) return;
      const ids = items.map((item) => item.id);
      const from = ids.indexOf(id);
      if (from < 0) return;
      ids.splice(from, 1);
      const at = ids.indexOf(target);
      if (at < 0) return;
      ids.splice(side === 'after' ? at + 1 : at, 0, id);
      if (ids.some((value, i) => value !== items[i]?.id)) onReorder(ids);
    },
    [items, onReorder],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.target !== event.currentTarget) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const tabs = Array.from(scroller.querySelectorAll<HTMLElement>(LIVE_TABS));
    const index = tabs.indexOf(event.currentTarget);
    const reorderStep = Object.hasOwn(REORDER_KEYS, event.key) ? REORDER_KEYS[event.key] : undefined;

    if (reorderStep && event.altKey && event.shiftKey && onReorder) {
      const at = items.findIndex((item) => item.id === id);
      const neighbour = items[at + reorderStep.offset];
      if (neighbour) reorder(id, neighbour.id, reorderStep.side);
      event.preventDefault();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!Object.hasOwn(TAB_KEY_HANDLERS, event.key)) return;

    const handled = TAB_KEY_HANDLERS[event.key]({
      tabs,
      index,
      select: () => onSelect(id),
      close: () => {
        const at = items.findIndex((item) => item.id === id);
        pendingFocus.current = { closing: id, next: items[at + 1]?.id ?? items[at - 1]?.id ?? null };
        onClose(id);
      },
    });
    if (handled === false) return;
    event.preventDefault();
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft += event.deltaMode === event.nativeEvent.DOM_DELTA_LINE ? event.deltaY * LINE_HEIGHT : event.deltaY;
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!onReorder) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(TAB_MIME, id);
    setDrag({ id, over: null, side: 'before' });
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!drag || !event.dataTransfer.types.includes(TAB_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const box = event.currentTarget.getBoundingClientRect();
    const side: DropSide = event.clientX < box.left + box.width / 2 ? 'before' : 'after';
    const over = id === drag.id ? null : id;
    if (drag.over !== over || drag.side !== side) setDrag({ ...drag, over, side });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!drag) return;
    event.preventDefault();
    if (drag.over) reorder(drag.id, drag.over, drag.side);
    setDrag(null);
  };

  const mask = edges.left || edges.right
    ? `linear-gradient(to right, ${edges.left ? 'transparent, black 24px' : 'black, black'}, ${edges.right ? 'black calc(100% - 24px), transparent' : 'black'})`
    : undefined;

  return (
    <div
      data-slot="editor-tabs"
      className={cn('flex h-9 min-w-0 shrink-0 items-center gap-1 px-1.5', className)}
      onPointerDown={(event) => {
        pendingFocus.current = null;
        onPointerDown?.(event);
      }}
      {...rest}
    >
      <motion.div
        ref={scrollerRef}
        layoutScroll
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onWheel={handleWheel}
        className="flex h-full min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <EditorTab
              key={item.id}
              item={item}
              active={item.id === activeId}
              focusable={activeIndex >= 0 ? index === activeIndex : index === 0}
              pillId={pillId}
              reduce={reduce}
              drop={drag && drag.over === item.id ? drag.side : null}
              draggable={!!onReorder}
              renderLabel={renderLabel}
              onSelect={onSelect}
              onClose={onClose}
              onKeyDown={handleKeyDown}
              onReveal={reveal}
              onContextMenu={onTabContextMenu}
              onDoubleClick={onTabDoubleClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={() => setDrag(null)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      {trailing ? <div className="flex shrink-0 items-center gap-0.5">{trailing}</div> : null}
    </div>
  );
}
