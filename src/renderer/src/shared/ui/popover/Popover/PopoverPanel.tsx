import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { KEY } from '@/shared/config';
import { cn, DURATION, EASE_OUT, SPRING_PANEL, useRegisterOverlay } from '@/shared/lib';
import { inMenu } from './inMenu';
import { place } from './place';
import type { Placement, PopoverProps } from './types';

/** A popover scales in from its anchor, and a little way back as it closes. */
const SCALE = { enterFrom: 0.94, exitTo: 0.97 } as const;


/** The open panel: placed beside its anchor, and closed by what happens outside it. */
export function PopoverPanel({ onOpenChange, anchor, side = 'right', label, children, className }: PopoverProps) {
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
    // Its menus count as inside it: choosing from one must not close it.
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (!!panelRef.current?.contains(target) || !!anchor?.contains(target) || inMenu(target));
    const onKeyDown = (event: KeyboardEvent) => {
      // Esc in one of its menus closes the menu only.
      if (event.key !== KEY.escape || event.isComposing || inMenu(event.target)) return;
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
      initial={{ opacity: 0, scale: reduce ? 1 : SCALE.enterFrom }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduce ? 1 : SCALE.exitTo, transition: { duration: DURATION.short2, ease: EASE_OUT } }}
      transition={reduce ? { duration: DURATION.short2 } : { default: SPRING_PANEL, opacity: { duration: DURATION.short4, ease: EASE_OUT } }}
      style={{ left: placement.left, top: placement.top, transformOrigin: `${placement.originX}px ${placement.originY}px` }}
      className={cn('fixed z-[1000] rounded-xl bg-surface-overlay p-3 text-[13px] text-fg shadow-overlay outline-none backdrop-blur-xl', className)}
    >
      {children}
    </motion.div>
  );
}
