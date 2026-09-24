// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import { CheckIcon } from '@/shared/config/icons';
import { cn, DURATION, EASE_OUT, SPRING_LAYOUT, SPRING_PANEL, useRegisterOverlay } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { Kbd } from '@/shared/ui/kbd';
import { isMenuSeparator } from '../isMenuSeparator';
import type { MenuAction, MenuItem } from '../types';
import { INITIAL_ACTIVE } from './initialActive';
import { initialPlacement } from './initialPlacement';
import { MENU_KEY_HANDLERS } from './menuKeyHandlers';
import { place } from './place';
import type { MenuAnchor, MenuCloseReason, MenuInitialFocus, Placement } from './types';

/** A menu scales in from its anchor, and a little way back as it closes. */
const SCALE = { enterFrom: 0.92, exitTo: 0.96 } as const;

const TYPEAHEAD_RESET_MS = 500;
/** Room kept above or below the highlighted row when the panel scrolls to it, in px. */
const SCROLL_MARGIN = 4;

export interface MenuPanelProps {
  id: string;
  items: MenuItem[];
  anchor: MenuAnchor;
  /** Keyboard-opened menus start on the first (or, via ArrowUp, the last) item; pointer-opened ones start with no highlight. */
  initialFocus: MenuInitialFocus;
  onClose: (reason: MenuCloseReason) => void;
  /** Pointer-downs and focus moves into this element don't count as "outside" (the dropdown's trigger). */
  ignoreRef?: RefObject<HTMLElement | null>;
  label?: string;
  className?: string;
}

/**
 * The floating list shared by `Menu` and `ContextMenu`. Mounted only while
 * visible (inside `AnimatePresence`), so it registers itself as an overlay for
 * exactly as long as it is on screen, exit animation included.
 */
export function MenuPanel({ id, items, anchor, initialFocus, onClose, ignoreRef, label, className }: MenuPanelProps) {
  useRegisterOverlay(true);
  const reduce = useReducedMotion() ?? false;
  const isPresent = useIsPresent();
  // Per mount, not per menu: a panel opened while the previous one is still exiting
  // must not share (and glide in from) the old panel's highlight.
  const highlightId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const typeahead = useRef({ buffer: '', timer: 0 });
  /** A focus loss with no new target, waiting to be told apart from a window blur. */
  const blurCheck = useRef({ timer: 0, pending: false });

  // Latest values for the window listeners, which are bound once.
  const live = useRef({ onClose, isPresent, anchor });
  useLayoutEffect(() => {
    live.current = { onClose, isPresent, anchor };
  });

  const enabled = useMemo(
    () => items.flatMap((item, index) => (!isMenuSeparator(item) && !item.disabled ? [index] : [])),
    [items],
  );
  const [active, setActive] = useState(() => INITIAL_ACTIVE[initialFocus](enabled));
  const [placement, setPlacement] = useState<Placement>(() => initialPlacement(anchor));

  // Measure with offset sizes (transform-free: the panel is mid scale-in) and fit before paint.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const next = place(anchor, el.offsetWidth, el.offsetHeight);
    setPlacement((prev) =>
      prev.left === next.left && prev.top === next.top && prev.originX === next.originX && prev.originY === next.originY
        ? prev
        : next,
    );
  }, [anchor, items.length]);

  // Roving focus: the highlighted row owns DOM focus; with no highlight the panel does.
  // The panel is scrolled by hand so focusing never scrolls anything behind it.
  useEffect(() => {
    if (!isPresent) return;
    const panel = panelRef.current;
    const item = active >= 0 ? itemRefs.current[active] : null;
    (item ?? panel)?.focus({ preventScroll: true });
    if (!panel || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < panel.scrollTop) panel.scrollTop = top - SCROLL_MARGIN;
    else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight + SCROLL_MARGIN;
  }, [active, isPresent]);

  useEffect(() => {
    const close = (reason: MenuCloseReason) => {
      if (live.current.isPresent) live.current.onClose(reason);
    };
    const focusInside = () => {
      if (blurCheck.current.pending) return true; // it just left for nowhere, i.e. the window
      const focused = document.activeElement;
      return !!focused && focused !== document.body && !!panelRef.current?.contains(focused);
    };
    // Closed by the environment: hand focus back only if the menu had it.
    const dismiss = () => close(focusInside() ? 'dismiss' : 'outside');
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || panelRef.current?.contains(target) || ignoreRef?.current?.contains(target)) return;
      close('outside');
    };
    // The panel is `fixed`: once whatever holds its anchor scrolls, it would float detached.
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node) || panelRef.current?.contains(target)) return;
      const { anchor } = live.current;
      const anchorEl = anchor.type === 'element' ? anchor.element.current : anchor.within;
      if (anchorEl && !target.contains(anchorEl)) return;
      dismiss();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    const ta = typeahead.current;
    const check = blurCheck.current;
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
      window.clearTimeout(ta.timer);
      window.clearTimeout(check.timer);
    };
  }, [ignoreRef]);

  const choose = (index: number) => {
    const item = items[index];
    if (!item || isMenuSeparator(item) || item.disabled || !isPresent) return;
    onClose('select');
    item.onSelect();
  };

  const move = (direction: 1 | -1) => {
    if (enabled.length === 0) return;
    const at = enabled.indexOf(active);
    const next = at < 0 ? (direction === 1 ? 0 : enabled.length - 1) : (at + direction + enabled.length) % enabled.length;
    setActive(enabled[next]!);
  };

  const runTypeahead = (key: string) => {
    const ta = typeahead.current;
    window.clearTimeout(ta.timer);
    ta.buffer += key.toLocaleLowerCase();
    ta.timer = window.setTimeout(() => (ta.buffer = ''), TYPEAHEAD_RESET_MS);
    // Repeating one letter cycles through the rows that start with it.
    const cycling = [...ta.buffer].every((char) => char === ta.buffer[0]);
    const query = cycling ? ta.buffer[0]! : ta.buffer;
    const from = enabled.indexOf(active) + (cycling ? 1 : 0);
    const order = from <= 0 ? enabled : [...enabled.slice(from), ...enabled.slice(0, from)];
    const hit = order.find((index) => (items[index] as MenuAction).label.toLocaleLowerCase().startsWith(query));
    if (hit !== undefined) setActive(hit);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (Object.hasOwn(MENU_KEY_HANDLERS, event.key)) {
      MENU_KEY_HANDLERS[event.key](event, {
        enabled,
        setActive,
        move,
        chooseActive: () => {
          if (active >= 0) choose(active);
        },
        typing: !!typeahead.current.buffer,
        runTypeahead,
        onClose,
      });
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) runTypeahead(event.key);
  };

  const onBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!isPresent) return;
    const next = event.relatedTarget as Node | null;
    if (next) {
      if (!panelRef.current?.contains(next) && !ignoreRef?.current?.contains(next)) onClose('blur');
      return;
    }
    // No new target: the window lost focus (the window `blur` listener closes with
    // `dismiss`, so focus comes back to the trigger), or focus fell to <body>.
    // Decide once the event has settled.
    const check = blurCheck.current;
    window.clearTimeout(check.timer);
    check.pending = true;
    check.timer = window.setTimeout(() => {
      check.pending = false;
      if (!document.hasFocus() || !live.current.isPresent) return;
      const focused = document.activeElement;
      if (focused && focused !== document.body && (panelRef.current?.contains(focused) || ignoreRef?.current?.contains(focused))) return;
      live.current.onClose('blur');
    }, 0);
  };

  const hasIcons = items.some((item) => !isMenuSeparator(item) && item.icon);
  const hasChecks = items.some((item) => !isMenuSeparator(item) && item.checked !== undefined);

  return (
    <motion.div
      ref={panelRef}
      id={id}
      role="menu"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={-1}
      inert={!isPresent}
      initial={{ opacity: 0, scale: reduce ? 1 : SCALE.enterFrom }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduce ? 1 : SCALE.exitTo, transition: { duration: DURATION.short2, ease: EASE_OUT } }}
      transition={reduce ? { duration: DURATION.short2 } : { default: SPRING_PANEL, opacity: { duration: DURATION.short4, ease: EASE_OUT } }}
      style={{
        left: placement.left,
        top: placement.top,
        transformOrigin: `${placement.originX}px ${placement.originY}px`,
      }}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') setActive(-1);
      }}
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        'fixed z-[1000] min-w-[184px] max-w-[320px] overflow-y-auto overscroll-contain rounded-xl bg-surface-overlay p-1 text-[13px] text-fg shadow-overlay outline-none backdrop-blur-xl',
        'max-h-[calc(100vh-16px)] will-change-transform',
        className,
      )}
    >
      {items.map((item, index) => {
        if (isMenuSeparator(item)) {
          return <div key={`separator-${index}`} role="separator" className="-mx-1 my-1 h-px bg-line" />;
        }
        const isActive = active === index;
        return (
          <div
            key={`${index}-${item.label}`}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
            aria-checked={item.checked}
            aria-disabled={item.disabled || undefined}
            tabIndex={-1}
            data-active={isActive || undefined}
            onPointerMove={(event) => {
              if (event.pointerType !== 'touch' && !item.disabled && !isActive) setActive(index);
            }}
            onClick={() => choose(index)}
            className={cn(
              'relative isolate flex h-7 cursor-default select-none items-center gap-2 rounded-lg px-2 outline-none',
              item.danger ? 'text-danger' : 'text-fg',
              item.disabled && 'opacity-40',
            )}
          >
            {isActive ? (
              <motion.span
                aria-hidden
                layoutId={highlightId}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                className={cn('absolute inset-0 -z-10 rounded-lg', item.danger ? 'bg-danger/15' : 'bg-pressed')}
              />
            ) : null}
            {hasChecks ? (
              <Icon icon={CheckIcon} size={14} className={cn('text-accent', !item.checked && 'invisible')} />
            ) : null}
            {hasIcons ? (
              item.icon ? (
                <Icon icon={item.icon} size={16} className={item.danger ? 'text-danger' : 'text-fg-muted'} />
              ) : (
                <span className="size-4 shrink-0" />
              )
            ) : null}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.shortcut?.length ? <Kbd keys={item.shortcut} className="ml-6" /> : null}
          </div>
        );
      })}
    </motion.div>
  );
}
