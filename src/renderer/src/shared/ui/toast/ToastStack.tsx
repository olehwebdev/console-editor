// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import {
  animate,
  AnimatePresence,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, InfoIcon, SuccessIcon, WarningIcon } from '@/shared/config/icons';
import { cn, EASE_OUT, useRegisterOverlay } from '@/shared/lib';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { toast, usePrimaryHost, useToasts, type ToastRecord, type ToastTone } from './store';

/** How far each card behind the front one peeks out while collapsed. */
const PEEK = 9;
const GAP = 8;
const SCALE_STEP = 0.05;
const RADIUS = 12;
const SWIPE_DISTANCE = 72;
const SWIPE_VELOCITY = 500;
const STACK_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.75 } as const;

const TONE_ICON: Record<ToastTone, IconGlyph> = {
  neutral: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  danger: AlertCircleIcon,
};

const TONE_CLASS: Record<ToastTone, string> = {
  neutral: 'text-fg-muted',
  success: 'text-live',
  warning: 'text-warning',
  danger: 'text-danger',
};

/** The first control of a card that can take focus (skips stacked, hidden and exiting cards). */
function focusableIn(card: Element): HTMLElement | null {
  for (const button of card.querySelectorAll<HTMLElement>('button')) {
    if (!button.closest('[inert], [data-exiting]')) return button;
  }
  return null;
}

let focusHost: (() => boolean) | null = null;

/**
 * Moves keyboard focus to the front toast (its action, else its close button),
 * which fans the stack out and pauses the timers. Tab walks the cards, Esc
 * dismisses one, and focus returns to where it was once the last one goes.
 * Returns false when there is no toast. Bind it to a hotkey (e.g. F6 or Alt+N):
 * the stack is portalled to the end of <body>, so Tab alone reaches it last.
 */
export function focusToasts(): boolean {
  return focusHost?.() ?? false;
}

export interface ToastStackProps {
  /** Placement and size of the stack. Default `bottom-4 left-4 w-[340px]`; e.g. pass `bottom-9 left-14`. */
  className?: string;
  /** Cards shown at once (collapsed and expanded). Default 3. */
  visibleCount?: number;
  /**
   * Freeze the native page view while toasts are on screen. Default false:
   * toasts are non-modal, and freezing would show a still of the page while,
   * say, a "Saved, reloading…" toast is up. Turn on only if the stack's
   * placement can overlap the page view.
   */
  registerOverlay?: boolean;
}

/**
 * Renders the toasts raised with `toast()`. Mount exactly once near the root
 * (if several are mounted, only the first to register renders, so don't add
 * one in a subtree). Cards stack while idle and fan out on hover or focus
 * (timers pause meanwhile); swipe sideways or press Esc on a card to dismiss it.
 * New toasts are announced politely to screen readers; see `focusToasts()`.
 */
export function ToastStack(props: ToastStackProps) {
  const primary = usePrimaryHost();
  return primary ? <ToastStackHost {...props} /> : null;
}

function ToastStackHost({ className, visibleCount = 3, registerOverlay = false }: ToastStackProps) {
  const toasts = useToasts();
  // Fanned out while hovered, while focus is inside, and for the whole of a swipe.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const expanded = toasts.length > 0 && (hovered || focused || dragging);
  const [heights, setHeights] = useState<Record<string, number>>({});
  // Stays on through the last card's exit so the page view isn't unfrozen under it.
  const [lingering, setLingering] = useState(false);
  if (toasts.length > 0 && !lingering) setLingering(true);
  useRegisterOverlay(registerOverlay && (toasts.length > 0 || lingering));

  const latest = useRef(toasts);
  useLayoutEffect(() => {
    latest.current = toasts;
  });

  const onHeight = useCallback((id: string, height: number) => {
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  }, []);

  const listRef = useRef<HTMLOListElement>(null);
  /** Where focus was before it entered the stack; it goes back there when the stack lets go. */
  const returnFocus = useRef<HTMLElement | null>(null);

  /** Focus is leaving `card` (dismissed, or going away): to a neighbouring card, else back out. */
  const handOffFocus = useCallback((card: HTMLElement, toNeighbour: boolean) => {
    if (toNeighbour) {
      const cards = Array.from(listRef.current?.children ?? []);
      const at = cards.indexOf(card);
      const order = at < 0 ? cards : [...cards.slice(at + 1), ...cards.slice(0, at).reverse()];
      for (const other of order) {
        const target = other === card ? null : focusableIn(other);
        if (target) {
          target.focus({ preventScroll: true });
          return;
        }
      }
    }
    const back = returnFocus.current;
    returnFocus.current = null;
    if (back && back !== document.body && back.isConnected) back.focus({ preventScroll: true });
    else if (document.activeElement instanceof HTMLElement && card.contains(document.activeElement)) document.activeElement.blur();
  }, []);

  useEffect(() => {
    const focusFront = () => {
      const list = listRef.current;
      if (!list) return false;
      let target: HTMLElement | null = null;
      for (const card of list.children) {
        target = focusableIn(card);
        if (target) break;
      }
      if (!target) return false;
      const active = document.activeElement;
      if (!list.contains(active)) returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
      target.focus({ preventScroll: true });
      return true;
    };
    focusHost = focusFront;
    return () => {
      if (focusHost === focusFront) focusHost = null;
    };
  }, []);

  const onExitComplete = useCallback(() => {
    const live = latest.current;
    if (live.length === 0) {
      setLingering(false);
      // The emptied stack has no box left for a pointerleave to come from.
      setHovered(false);
    }
    // A focused card that went away takes focus with it without a blur event
    // (checked a frame later, once the exited card has left the DOM).
    requestAnimationFrame(() => {
      if (!listRef.current?.contains(document.activeElement)) setFocused(false);
    });
    setHeights((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => live.some((t) => t.id === id))));
  }, []);

  // Newest first: index 0 is the front card.
  const ordered = [...toasts].reverse();
  const shown = Math.max(1, visibleCount);
  const frontHeight = ordered[0] ? (heights[ordered[0].id] ?? 0) : 0;
  const offsets: number[] = [];
  let expandedHeight = 0;
  ordered.forEach((t, index) => {
    offsets.push(expandedHeight);
    if (index < shown) expandedHeight += (heights[t.id] ?? 0) + GAP;
  });
  expandedHeight = Math.max(0, expandedHeight - GAP);

  const onFocus = (event: ReactFocusEvent<HTMLOListElement>) => {
    setFocused(true);
    const from = event.relatedTarget;
    if (from instanceof Node && event.currentTarget.contains(from)) return;
    if (from instanceof HTMLElement && from !== document.body) returnFocus.current = from;
  };

  const onBlur = (event: ReactFocusEvent<HTMLOListElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return createPortal(
    <ol
      ref={listRef}
      aria-label="Notifications"
      // One polite region for every tone (a per-card role="alert" inside it would be read twice).
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      data-expanded={expanded || undefined}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={cn('fixed bottom-4 left-4 z-[1200] w-[340px] max-w-[calc(100vw-32px)]', className)}
      style={{ height: toasts.length === 0 ? 0 : expanded ? expandedHeight : frontHeight }}
    >
      <AnimatePresence initial={false} onExitComplete={onExitComplete}>
        {ordered.map((t, index) => (
          <ToastCard
            key={t.id}
            toast={t}
            index={index}
            expanded={expanded}
            hidden={index >= shown}
            frontHeight={frontHeight}
            offset={offsets[index] ?? 0}
            maxIndex={shown - 1}
            height={heights[t.id]}
            onHeight={onHeight}
            onDragChange={setDragging}
            handOffFocus={handOffFocus}
          />
        ))}
      </AnimatePresence>
    </ol>,
    document.body,
  );
}

interface ToastCardProps {
  toast: ToastRecord;
  index: number;
  expanded: boolean;
  hidden: boolean;
  frontHeight: number;
  /** Distance from the bottom of the stack when expanded. */
  offset: number;
  maxIndex: number;
  /** Natural height, once measured. */
  height: number | undefined;
  onHeight: (id: string, height: number) => void;
  onDragChange: (dragging: boolean) => void;
  handOffFocus: (card: HTMLElement, toNeighbour: boolean) => void;
}

const ToastCard = memo(function ToastCard({
  toast: t,
  index,
  expanded,
  hidden,
  frontHeight,
  offset,
  maxIndex,
  height,
  onHeight,
  onDragChange,
  handOffFocus,
}: ToastCardProps) {
  const reduce = useReducedMotion() ?? false;
  const isPresent = useIsPresent();
  const cardRef = useRef<HTMLLIElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [exitX, setExitX] = useState(0);

  const hasFocus = () => {
    const focused = document.activeElement;
    return !!focused && !!cardRef.current?.contains(focused);
  };

  // Dismissing from inside the card hands focus on first: to the next card when
  // done from the keyboard, else back to where it was before (so the stack can collapse).
  const dismissSelf = (viaKeyboard: boolean) => {
    if (cardRef.current && hasFocus()) handOffFocus(cardRef.current, viaKeyboard);
    toast.dismiss(t.id);
  };

  // Removed by code (`toast.dismiss(id)`) while focused: don't drop focus to <body>.
  useEffect(() => {
    if (!isPresent && cardRef.current && hasFocus()) handOffFocus(cardRef.current, true);
  }, [isPresent, handOffFocus]);

  // Natural height comes from the content; the background is what gets squeezed while stacked.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => onHeight(t.id, el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [t.id, onHeight]);

  // Auto-dismiss; the clock stops while the stack is expanded (hovered or focused).
  const remaining = useRef(t.duration);
  useEffect(() => {
    remaining.current = t.duration;
  }, [t.version, t.duration]);
  useEffect(() => {
    if (expanded || !Number.isFinite(t.duration) || t.duration <= 0) return;
    const started = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(t.id), Math.max(0, remaining.current));
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [expanded, t.id, t.version, t.duration]);

  const depth = Math.min(index, maxIndex);
  const stacked = !expanded && index > 0;
  // Transforms only. The card keeps its natural height and scales about its bottom edge;
  // behind the front card, y is chosen so the top edge peeks out PEEK px per level.
  const scale = expanded ? 1 : 1 - depth * SCALE_STEP;
  const y = expanded ? -offset : -(depth * PEEK + frontHeight * (1 - scale));

  // Stacked cards borrow the front card's height by scaling their background (not
  // animating `height`); the radius is counter-scaled so the corners stay round.
  const bgScale = useMotionValue(1);
  const bgRadius = useTransform(bgScale, (s) => `${RADIUS}px / ${RADIUS / Math.max(s, 0.05)}px`);
  const bgTarget = stacked && height && frontHeight ? frontHeight / height : 1;
  useEffect(() => {
    if (reduce) {
      bgScale.set(bgTarget);
      return;
    }
    const controls = animate(bgScale, bgTarget, STACK_SPRING);
    return () => controls.stop();
  }, [bgTarget, reduce, bgScale]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    onDragChange(false);
    if (Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
      setExitX(Math.sign(info.offset.x || info.velocity.x) * 380);
      dismissSelf(false);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      dismissSelf(true);
    }
  };

  // Enter/Space activation produces a click with no pointer detail.
  const byKeyboard = (event: ReactMouseEvent) => event.detail === 0;

  // Two actions, or one beside long text, get a row of their own so the text keeps its width.
  const long = (node: unknown, max: number) => typeof node === 'string' && node.length > max;
  const actionsBelow = !!t.secondaryAction || (!!t.action && (long(t.title, 32) || long(t.description, 64)));
  const actions = (
    <>
      {t.secondaryAction ? (
        <button
          type="button"
          onClick={(event) => {
            t.secondaryAction?.onClick();
            dismissSelf(byKeyboard(event));
          }}
          className="h-6 shrink-0 self-center rounded-md px-2 text-xs font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent/60"
        >
          {t.secondaryAction.label}
        </button>
      ) : null}
      {t.action ? (
        <button
          type="button"
          onClick={(event) => {
            t.action?.onClick();
            dismissSelf(byKeyboard(event));
          }}
          className="h-6 shrink-0 self-center rounded-md bg-hover px-2 text-xs font-medium text-fg transition-colors hover:bg-pressed focus-visible:outline-2 focus-visible:outline-accent/60"
        >
          {t.action.label}
        </button>
      ) : null}
    </>
  );

  return (
    <motion.li
      ref={cardRef}
      initial={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : 0.96 }}
      animate={{ opacity: hidden ? 0 : 1, y, scale }}
      exit={
        exitX
          ? { x: exitX, opacity: 0, transition: { duration: 0.2, ease: EASE_OUT } }
          : { opacity: 0, scale: reduce ? 1 : 0.96, transition: { duration: 0.16, ease: EASE_OUT } }
      }
      transition={reduce ? { duration: 0.12 } : { default: STACK_SPRING, opacity: { duration: 0.18, ease: EASE_OUT } }}
      drag={hidden || stacked ? false : 'x'}
      dragSnapToOrigin
      onDragStart={() => onDragChange(true)}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      style={{ zIndex: 100 - index, transformOrigin: '50% 100%' }}
      // Not `inert` while exiting: that would drop focus before it can be handed on.
      data-exiting={!isPresent || undefined}
      // A stacked card is only hit where its squeezed background shows (the peek).
      className={cn(
        'group absolute inset-x-0 bottom-0 will-change-transform',
        (stacked || hidden || !isPresent) && 'pointer-events-none',
      )}
    >
      <motion.div
        aria-hidden
        style={{ scaleY: bgScale, borderRadius: bgRadius, originY: 1 }}
        className={cn(
          'absolute inset-0 bg-surface-overlay shadow-overlay backdrop-blur-xl',
          stacked && !hidden && isPresent && 'pointer-events-auto',
        )}
      />
      <motion.div
        ref={contentRef}
        initial={false}
        animate={{ opacity: stacked ? 0 : 1 }}
        transition={{ duration: 0.16, ease: EASE_OUT }}
        inert={stacked || hidden}
        className="relative flex items-start gap-2.5 px-3 py-2.5"
      >
        <Icon icon={TONE_ICON[t.tone]} size={16} className={cn('mt-0.5', TONE_CLASS[t.tone])} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-5 text-fg">{t.title}</p>
          {t.description ? <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-fg-muted">{t.description}</p> : null}
          {actionsBelow ? <div className="-mr-6 mt-2 flex justify-end gap-1">{actions}</div> : null}
        </div>
        {actionsBelow ? null : actions}
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={(event) => dismissSelf(byKeyboard(event))}
          className={cn(
            '-mr-1 grid size-5 shrink-0 place-items-center rounded-md text-fg-subtle opacity-0 transition-opacity duration-150 hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100',
            actionsBelow ? 'self-start' : 'self-center',
          )}
        >
          <Icon icon={CloseIcon} size={14} />
        </button>
      </motion.div>
    </motion.li>
  );
});
