// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { motion, type Variants } from 'motion/react';
import type { ReactNode, RefObject } from 'react';
import { cn, DURATION, EASE_OUT } from '@/shared/lib';
import { Kbd } from '@/shared/ui/kbd';
import { showsContent } from './showsContent';
import type { Placement, TooltipSide } from './types';

const ORIGIN: Record<TooltipSide, string> = {
  top: 'center bottom',
  bottom: 'center top',
  left: 'right center',
  right: 'left center',
};

/** The surface grows in from a little smaller, and shrinks less as it goes. */
const SCALE = { enterFrom: 0.96, exitTo: 0.98 } as const;

// The surface starts a few px towards the trigger and settles outwards.
const OFFSET: Record<TooltipSide, { x: number; y: number }> = {
  top: { x: 0, y: 4 },
  bottom: { x: 0, y: -4 },
  left: { x: 4, y: 0 },
  right: { x: -4, y: 0 },
};

const VARIANTS: Variants = {
  initial: (side: TooltipSide) => ({ opacity: 0, scale: SCALE.enterFrom, ...OFFSET[side] }),
  animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: { duration: DURATION.short4, ease: EASE_OUT } },
  exit: { opacity: 0, scale: SCALE.exitTo, transition: { duration: DURATION.short1, ease: EASE_OUT } },
};

const REDUCED_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.short3 } },
  exit: { opacity: 0, transition: { duration: DURATION.short1 } },
};

interface TooltipSurfaceProps {
  surfaceRef: RefObject<HTMLDivElement | null>;
  id: string;
  /** Where it sits; null until measured, when it renders hidden on the preferred side. */
  placement: Placement | null;
  side: TooltipSide;
  reduce: boolean | null;
  content: ReactNode;
  shortcut?: string[];
  className?: string;
}

/** The floating label itself. */
export function TooltipSurface({ surfaceRef, id, placement, side, reduce, content, shortcut, className }: TooltipSurfaceProps) {
  const placed = placement ?? { top: 0, left: 0, side };
  return (
    <motion.div
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
      {showsContent(content) ? <span className="min-w-0">{content}</span> : null}
      {shortcut?.length ? <Kbd keys={shortcut} className="-mr-0.5 shrink-0" /> : null}
    </motion.div>
  );
}
