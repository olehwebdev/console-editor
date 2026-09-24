import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn, EASE_OUT, SPRING_PANEL, useRegisterOverlay } from '@/shared/lib';

export type PopoverSide = 'right' | 'bottom';

export interface PopoverProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /**
   * The element it opens beside; Esc gives focus back to it. Presses on it are
   * left to it (usually a toggle), rather than closing the popover as outside ones do.
   */
  anchor: HTMLElement | null;
  /** Default `right`: beside the anchor, top edges aligned. `bottom`: below it, left edges aligned. */
  side?: PopoverSide;
  /** Accessible name of the panel. */
  label: string;
  /** The panel's content; give its first field `autoFocus`. */
  children: ReactNode;
  /** Extra classes for the panel. */
  className?: string;
}

interface Placement {
  left: number;
  top: number;
  originX: number;
  originY: number;
}

const GAP = 8;
const VIEWPORT_PAD = 8;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** Beside (or below) the anchor, kept inside the viewport, scaling from the anchor. */
function place(anchor: HTMLElement | null, side: PopoverSide, width: number, height: number): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = anchor?.getBoundingClientRect() ?? new DOMRect(vw / 2, vh / 3, 0, 0);
  const left = clamp(side === 'right' ? r.right + GAP : r.left, VIEWPORT_PAD, vw - width - VIEWPORT_PAD);
  const top = clamp(side === 'right' ? r.top : r.bottom + GAP, VIEWPORT_PAD, vh - height - VIEWPORT_PAD);
  return side === 'right'
    ? { left, top, originX: 0, originY: clamp(r.top + r.height / 2 - top, 0, height) }
    : { left, top, originX: clamp(r.left + r.width / 2 - left, 0, width), originY: 0 };
}

/**
 * A small panel of controls beside an element (e.g. editing what a rail tile
 * shows). Not modal: it closes on Esc, on a press or focus outside it and its
 * anchor, and when the window loses focus or resizes. Like menus, it swaps the
 * page view for a still while open.
 */
export function Popover(props: PopoverProps) {
  return createPortal(<AnimatePresence>{props.open ? <PopoverPanel {...props} /> : null}</AnimatePresence>, document.body);
}

function PopoverPanel({ onOpenChange, anchor, side = 'right', label, children, className }: PopoverProps) {
  useRegisterOverlay(true);
  const isPresent = useIsPresent();
  const reduce = useReducedMotion() ?? false;
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement>(() => place(anchor, side, 0, 0));

  // Measured (transform-free offset sizes: it is mid scale-in) and fitted before paint.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (el) setPlacement(place(anchor, side, el.offsetWidth, el.offsetHeight));
  }, [anchor, side]);

  const close = useEffectEvent((restoreFocus: boolean) => {
    onOpenChange(false);
    if (restoreFocus && anchor?.isConnected) anchor.focus({ preventScroll: true });
  });

  // Leaving it closes it: listened for on the window while it is on screen (not while it plays its exit).
  useEffect(() => {
    if (!isPresent) return;
    const inside = (target: EventTarget | null) => target instanceof Node && (!!panelRef.current?.contains(target) || !!anchor?.contains(target));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!inside(event.target)) close(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!inside(event.target)) close(false);
    };
    const dismiss = () => close(false);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
    };
  }, [isPresent, anchor]);

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      inert={!isPresent}
      initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduce ? 1 : 0.97, transition: { duration: 0.1, ease: EASE_OUT } }}
      transition={reduce ? { duration: 0.1 } : { default: SPRING_PANEL, opacity: { duration: 0.14, ease: EASE_OUT } }}
      style={{ left: placement.left, top: placement.top, transformOrigin: `${placement.originX}px ${placement.originY}px` }}
      className={cn('fixed z-[1000] rounded-xl bg-surface-overlay p-3 text-[13px] text-fg shadow-overlay outline-none backdrop-blur-xl', className)}
    >
      {children}
    </motion.div>
  );
}
