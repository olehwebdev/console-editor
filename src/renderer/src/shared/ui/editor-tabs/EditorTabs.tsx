// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence, motion, useIsPresent, useReducedMotion, type Transition, type Variants } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type DragEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';
import { icons } from '@/shared/config';
import { cn, EASE_OUT, isMac, SPRING_LAYOUT } from '@/shared/lib';
import { Icon, type IconGlyph } from '@/shared/ui/icon';

/** Tints the tab's icon: status tones or file-kind colors. */
export type EditorTabTone = 'neutral' | 'accent' | 'live' | 'info' | 'warning' | 'danger' | 'js' | 'css' | 'html';

export interface EditorTabItem {
  id: string;
  label: string;
  /** A Hugeicons glyph (drawn at 14 px) or any node (e.g. a kind icon). */
  icon?: IconGlyph | ReactNode;
  /** Unsaved changes: a dot that swaps with the close button on hover. */
  dirty?: boolean;
  /** Preview / not-yet-kept tab. */
  italic?: boolean;
  /** Native tooltip, e.g. the full URL. */
  title?: string;
  tone?: EditorTabTone;
}

export interface EditorTabsProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect' | 'children'> {
  items: readonly EditorTabItem[];
  activeId: string | null | undefined;
  onSelect: (id: string) => void;
  /** Close button, middle click, Delete (also Backspace on macOS) on a keyboard-focused tab. */
  onClose: (id: string) => void;
  /** Enables drag-and-drop (and Alt+Shift+←/→) reordering; receives the new id order. */
  onReorder?: (ids: string[]) => void;
  /** Custom label content (defaults to `item.label`). */
  renderLabel?: (item: EditorTabItem, state: { active: boolean }) => ReactNode;
  /** Slot after the tabs (e.g. a split or "more" IconButton). */
  trailing?: ReactNode;
  onTabContextMenu?: (id: string, event: MouseEvent<HTMLElement>) => void;
  onTabDoubleClick?: (id: string) => void;
  /** Accessible name of the tab list. */
  label?: string;
}

const TONE: Record<EditorTabTone, string> = {
  neutral: '',
  accent: 'text-accent',
  live: 'text-live',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
  js: 'text-kind-js',
  css: 'text-kind-css',
  html: 'text-kind-html',
};

/**
 * Private drag payload. Never `text/plain`: Monaco's drop-into-editor and every
 * text input accept plain text, so releasing a tab over them would insert its id.
 */
const TAB_MIME = 'application/x-console-editor-tab';

const INSTANT: Transition = { duration: 0 };
const WIDTH: Transition = { duration: 0.2, ease: EASE_OUT };
const FADE: Transition = { duration: 0.14, ease: EASE_OUT };

// The wrapper animates width (siblings slide); the content fades. The active
// pill sits outside the fading content so it glides at full opacity.
const WRAPPER: Variants = { hidden: { width: 0 }, shown: { width: 'auto' } };
const CONTENT: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1 } };

function isGlyph(value: unknown): value is IconGlyph {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]) && typeof value[0][0] === 'string';
}

type DropSide = 'before' | 'after';

interface TabProps {
  item: EditorTabItem;
  active: boolean;
  focusable: boolean;
  pillId: string;
  reduce: boolean;
  drop: DropSide | null;
  draggable: boolean;
  renderLabel?: EditorTabsProps['renderLabel'];
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>, id: string) => void;
  onReveal: (el: HTMLElement | null) => void;
  onContextMenu?: EditorTabsProps['onTabContextMenu'];
  onDoubleClick?: EditorTabsProps['onTabDoubleClick'];
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

function EditorTab({
  item,
  active,
  focusable,
  pillId,
  reduce,
  drop,
  draggable,
  renderLabel,
  onSelect,
  onClose,
  onKeyDown,
  onReveal,
  onContextMenu,
  onDoubleClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TabProps) {
  const present = useIsPresent();
  const tabRef = useRef<HTMLDivElement>(null);
  const mouseFocus = useRef(false);
  const { id, dirty = false } = item;

  // A click must never park focus on a tab: it would steal focus from the editor
  // (which the integrator may have just focused) and the next Delete meant for the
  // code would close the file. So mousedown keeps focus where it is; only when
  // focus is already in the strip (keyboard use) does it follow the click.
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const tab = event.currentTarget;
    if (event.button === 0) onSelect(id);
    if (event.button === 0 && draggable) {
      // Cancelling mousedown would also cancel the native drag, so let the
      // browser focus the tab and hand focus back in handleFocus.
      mouseFocus.current = true;
      window.setTimeout(() => {
        mouseFocus.current = false;
      }, 0);
      return;
    }
    event.preventDefault(); // also: no middle-click autoscroll (auxclick closes)
    if (event.button === 0 && tab.closest('[role="tablist"]')?.contains(document.activeElement)) tab.focus({ preventScroll: true });
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const tab = event.currentTarget;
    const from = event.relatedTarget;
    if (mouseFocus.current) {
      mouseFocus.current = false;
      if (!(from instanceof Node && tab.closest('[role="tablist"]')?.contains(from))) {
        // Deferred: moving focus while the button is still down cancels the drag.
        window.setTimeout(() => {
          if (document.activeElement !== tab) return;
          if (from instanceof HTMLElement && from.isConnected) from.focus({ preventScroll: true });
          else tab.blur();
        }, 0);
        return;
      }
    }
    onReveal(tab);
  };

  return (
    <motion.div
      className="flex shrink-0"
      variants={WRAPPER}
      initial="hidden"
      animate="shown"
      exit="hidden"
      transition={reduce ? INSTANT : WIDTH}
      onAnimationComplete={(definition) => {
        // An entering tab only has its full scroll width once it has grown.
        if (definition === 'shown' && active) onReveal(tabRef.current);
      }}
    >
      <div
        ref={tabRef}
        role="tab"
        aria-selected={active}
        aria-hidden={!present || undefined}
        aria-keyshortcuts={isMac ? 'Delete Backspace' : 'Delete'}
        tabIndex={present && focusable ? 0 : -1}
        title={item.title}
        data-tab-id={id}
        data-active={active || undefined}
        data-dirty={dirty || undefined}
        data-exiting={!present || undefined}
        draggable={draggable && present}
        onMouseDown={handleMouseDown}
        onAuxClick={(event) => {
          if (event.button !== 1) return;
          event.preventDefault();
          onClose(id);
        }}
        onKeyDown={(event) => onKeyDown(event, id)}
        onFocus={handleFocus}
        onContextMenu={onContextMenu ? (event) => onContextMenu(id, event) : undefined}
        onDoubleClick={onDoubleClick ? () => onDoubleClick(id) : undefined}
        onDragStart={(event) => onDragStart(event, id)}
        onDragOver={(event) => onDragOver(event, id)}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={cn(
          'group/tab relative mr-0.5 flex h-7 max-w-[240px] shrink-0 cursor-default select-none items-center gap-1.5 rounded-lg pl-2.5 pr-1 text-[13px] outline-none',
          'transition-colors duration-150 ease-out-expo',
          'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/60',
          active ? 'text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg',
          !present && 'pointer-events-none',
        )}
      >
        {active ? (
          <motion.span
            layoutId={pillId}
            aria-hidden
            className="absolute inset-0 rounded-lg bg-surface-raised shadow-raised"
            style={{ borderRadius: 8 }}
            transition={reduce ? INSTANT : SPRING_LAYOUT}
          />
        ) : null}

        {drop ? (
          <span
            aria-hidden
            className={cn('pointer-events-none absolute inset-y-1 z-10 w-0.5 rounded-full bg-accent', drop === 'before' ? '-left-[3px]' : '-right-[3px]')}
          />
        ) : null}

        <motion.span variants={CONTENT} transition={reduce ? INSTANT : FADE} className="relative flex min-w-0 items-center gap-1.5">
          {item.icon ? (
            <span aria-hidden className={cn('grid size-4 shrink-0 place-items-center', item.tone && TONE[item.tone])}>
              {isGlyph(item.icon) ? <Icon icon={item.icon} size={14} /> : item.icon}
            </span>
          ) : null}
          <span className={cn('min-w-0 truncate', item.italic && 'italic')}>{renderLabel ? renderLabel(item, { active }) : item.label}</span>
        </motion.span>

        <motion.span variants={CONTENT} transition={reduce ? INSTANT : FADE} className="relative grid size-5 shrink-0 place-items-center">
          {dirty ? (
            <span
              aria-label="Unsaved changes"
              role="img"
              className={cn(
                'size-2 rounded-full transition-[opacity,scale] duration-150 ease-out-expo',
                active ? 'bg-fg' : 'bg-fg-muted',
                'group-hover/tab:scale-50 group-hover/tab:opacity-0',
              )}
            />
          ) : null}
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Close ${item.label}`}
            onMouseDown={(event) => {
              // Keep focus where it is and don't select the tab being closed.
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onClose(id);
            }}
            className={cn(
              'absolute inset-0 grid place-items-center rounded-md text-fg-subtle outline-none',
              'transition-[opacity,scale,background-color,color] duration-150 ease-out-expo hover:bg-pressed hover:text-fg',
              'group-hover/tab:pointer-events-auto group-hover/tab:scale-100 group-hover/tab:opacity-100',
              'group-focus-visible/tab:scale-100 group-focus-visible/tab:opacity-100',
              active && !dirty ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
            )}
          >
            <Icon icon={icons.CloseIcon} size={12} strokeWidth={2} />
          </button>
        </motion.span>
      </div>
    </motion.div>
  );
}

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
    return scrollerRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"]`) ?? null;
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
      if (Math.abs(delta) > 0.5) scroller.scrollBy({ left: delta, behavior: reduce ? 'instant' : 'smooth' });
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
    const tabs = Array.from(scroller.querySelectorAll<HTMLElement>('[role="tab"]:not([data-exiting])'));
    const index = tabs.indexOf(event.currentTarget);
    const n = tabs.length;
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';

    if (horizontal && event.altKey && event.shiftKey && onReorder) {
      const at = items.findIndex((item) => item.id === id);
      const neighbour = items[event.key === 'ArrowLeft' ? at - 1 : at + 1];
      if (neighbour) reorder(id, neighbour.id, event.key === 'ArrowLeft' ? 'before' : 'after');
      event.preventDefault();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    switch (event.key) {
      case 'ArrowRight':
        tabs[(index + 1) % n]?.focus();
        break;
      case 'ArrowLeft':
        tabs[(index - 1 + n) % n]?.focus();
        break;
      case 'Home':
        tabs[0]?.focus();
        break;
      case 'End':
        tabs[n - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        onSelect(id);
        break;
      case 'Backspace':
      case 'Delete': {
        // Backspace only where the key is labelled "delete" and there is no forward delete.
        if (event.key === 'Backspace' && !isMac) return;
        const at = items.findIndex((item) => item.id === id);
        pendingFocus.current = { closing: id, next: items[at + 1]?.id ?? items[at - 1]?.id ?? null };
        onClose(id);
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
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
