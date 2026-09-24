// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { KEY } from '@/shared/config';
import { cn, DURATION, EASE_OUT } from '@/shared/lib';
import { Kbd } from '@/shared/ui/kbd';
import { computePlacement } from './computePlacement';
import { isWarm } from './isWarm';
import type { Placement, TooltipSide } from './types';
import { warmth } from './warmth';

export interface TooltipProps {
  /** Tooltip text. When empty (and no shortcut) the trigger renders alone. */
  content: ReactNode;
  /**
   * Preferred side. Default `top`. Flips to the opposite (then a perpendicular) side
   * when there is no room, or when it would land on the native page view.
   */
  side?: TooltipSide;
  /** Shortcut rendered with <Kbd>, e.g. `['mod', 'S']`. */
  shortcut?: string[];
  /** The trigger: one element that can take `aria-describedby`. */
  children: ReactElement;
  /** Open delay while "cold" (ms). Default 400. Moving between tooltips is instant. */
  delay?: number;
  /** Suppress the tooltip (the trigger still renders). */
  disabled?: boolean;
  /** Controlled open state (e.g. to pin a tooltip open for review). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Point the trigger's `aria-describedby` at the tooltip while it is open.
   * Turn off when the content repeats the trigger's accessible name (IconButton does).
   */
  describeTrigger?: boolean;
  className?: string;
}

/** Open delay while "cold", unless `delay` says otherwise. */
const DELAY_MS = 400;
/** How long after a tooltip closes the next one still opens instantly. */
const WARM_WINDOW_MS = 300;

const ORIGIN: Record<TooltipSide, string> = {
  top: 'center bottom',
  bottom: 'center top',
  left: 'right center',
  right: 'left center',
};

// The surface starts a few px towards the trigger and settles outwards.
const OFFSET: Record<TooltipSide, { x: number; y: number }> = {
  top: { x: 0, y: 4 },
  bottom: { x: 0, y: -4 },
  left: { x: 4, y: 0 },
  right: { x: -4, y: 0 },
};

const VARIANTS: Variants = {
  initial: (side: TooltipSide) => ({ opacity: 0, scale: 0.96, ...OFFSET[side] }),
  animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: { duration: 0.14, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.08, ease: EASE_OUT } },
};

const REDUCED_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

/**
 * Hover/focus label for a control. Opens after `delay` (400 ms), instantly when
 * another tooltip was just showing; portals to <body>, never takes pointer
 * events, and closes on press, Escape, scroll and window blur. It flips away
 * from the window edge and from the native page view (see `setNativeViewRect`).
 *
 * The trigger is wrapped in a `display: contents` span, so it keeps its own
 * layout and its own handlers; the tooltip listens to bubbling events only.
 */
export function Tooltip({
  content,
  side = 'top',
  shortcut,
  children,
  delay = DELAY_MS,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  describeTrigger = true,
  className,
}: TooltipProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [internalOpen, setInternalOpen] = useState(false);
  const hasContent = (content !== null && content !== undefined && content !== false && content !== '') || !!shortcut?.length;
  const open = hasContent && !disabled && (controlledOpen ?? internalOpen);

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  // A press hides the tooltip until the pointer leaves the trigger.
  const suppressed = useRef(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  // The portal exists only while the tooltip is open or playing its exit, so a
  // toolbar full of closed tooltips costs no extra React trees.
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  const cancelTimer = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  const show = () => {
    if (disabled || !hasContent || suppressed.current) return;
    cancelTimer();
    if (isWarm()) setOpen(true);
    else timer.current = window.setTimeout(() => setOpen(true), delay);
  };

  const hide = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
    setOpen(false);
  }, [setOpen]);

  // Count open tooltips and start the warm window when this one closes.
  // Pinned (controlled) tooltips stay out of it, or they would keep every other tooltip warm.
  const tracksWarmth = controlledOpen === undefined;
  useEffect(() => {
    if (!open || !tracksWarmth) return;
    warmth.openTooltips += 1;
    return () => {
      warmth.openTooltips -= 1;
      warmth.warmUntil = performance.now() + WARM_WINDOW_MS;
    };
  }, [open, tracksWarmth]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const place = useCallback(() => {
    const anchor = wrapperRef.current?.firstElementChild;
    const surface = surfaceRef.current;
    if (!anchor || !surface) return;
    const next = computePlacement(anchor.getBoundingClientRect(), surface.offsetWidth, surface.offsetHeight, side);
    setPlacement((prev) => (prev && prev.top === next.top && prev.left === next.left && prev.side === next.side ? prev : next));
  }, [side]);

  const dismiss = useEffectEvent(() => hide());

  // While open: placed before paint (the surface renders hidden until then) and
  // again whenever its size changes (content swap, font load); Escape, scroll,
  // resize and window blur dismiss it. A pinned (controlled) tooltip cannot be
  // dismissed from here, so it follows its trigger instead.
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const surface = surfaceRef.current;
    const observer = new ResizeObserver(place);
    if (surface) observer.observe(surface);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === KEY.escape) dismiss();
    };
    const onMove = () => {
      place();
      dismiss();
    };
    const onBlur = () => dismiss();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onMove, { capture: true, passive: true });
    window.addEventListener('resize', onMove);
    window.addEventListener('blur', onBlur);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onMove, { capture: true });
      window.removeEventListener('resize', onMove);
      window.removeEventListener('blur', onBlur);
    };
  }, [open, place]);

  if (!isValidElement(children)) return children;
  if (!hasContent) return children;

  const childProps = children.props as { 'aria-describedby'?: string };
  const trigger =
    describeTrigger && open
      ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': [childProps['aria-describedby'], id].filter(Boolean).join(' '),
        })
      : children;

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    show();
  };
  const onPointerLeave = () => {
    suppressed.current = false;
    hide();
  };
  const onPointerDown = () => {
    suppressed.current = true;
    hide();
  };
  const onFocus = (event: FocusEvent) => {
    // Keyboard focus only: a click focuses too, and must not reopen the label.
    let visible = true;
    try {
      visible = (event.target as Element).matches(':focus-visible');
    } catch {
      /* selector unsupported */
    }
    if (visible) show();
  };

  const placed = placement ?? { top: 0, left: 0, side };

  return (
    <>
      <span
        ref={wrapperRef}
        className="contents"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onFocus={onFocus}
        onBlur={hide}
      >
        {trigger}
      </span>
      {mounted
        ? createPortal(
            <AnimatePresence onExitComplete={() => setMounted(false)}>
              {open ? (
                <motion.div
                  key="tooltip"
                  ref={surfaceRef}
                  id={id}
                  role="tooltip"
                  custom={placed.side}
                  variants={reduce ? REDUCED_VARIANTS : VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  style={{
                    top: placed.top,
                    left: placed.left,
                    transformOrigin: ORIGIN[placed.side],
                    visibility: placement ? undefined : 'hidden',
                  }}
                  className={cn(
                    'pointer-events-none fixed z-[1000] flex max-w-[min(320px,calc(100vw-12px))] items-center gap-2 rounded-lg',
                    'border border-line bg-surface-overlay px-2 py-1 text-xs leading-[18px] text-fg shadow-overlay backdrop-blur-md',
                    className,
                  )}
                >
                  {content !== null && content !== undefined && content !== false && content !== '' ? (
                    <span className="min-w-0">{content}</span>
                  ) : null}
                  {shortcut?.length ? <Kbd keys={shortcut} className="-mr-0.5 shrink-0" /> : null}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
