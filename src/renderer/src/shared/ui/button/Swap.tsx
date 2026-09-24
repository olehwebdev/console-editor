// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn, DURATION, EASE_OUT, SPRING_SWAP } from '@/shared/lib';

export interface SwapProps {
  /** Identity of the current content; changing it plays the swap. */
  value: string | number | boolean;
  children: ReactNode;
  /** Where the new content comes from: `up` rolls in from below (default), `down` from above. */
  direction?: 'up' | 'down';
  className?: string;
}

type Direction = NonNullable<SwapProps['direction']>;

/** Width changes smaller than this (px) are measuring noise, not a new width. */
const WIDTH_EPSILON = 0.5;

/** Where a rolling label comes from and goes to: most of its height below or above. */
const ROLL_TRAVEL = { below: '70%', above: '-70%' } as const;

const ROLL: Variants = {
  initial: (d: Direction) => ({ opacity: 0, y: d === 'up' ? ROLL_TRAVEL.below : ROLL_TRAVEL.above }),
  animate: { opacity: 1, y: '0%', transition: SPRING_SWAP },
  exit: (d: Direction) => ({
    opacity: 0,
    y: d === 'up' ? ROLL_TRAVEL.above : ROLL_TRAVEL.below,
    transition: { duration: DURATION.short3, ease: EASE_OUT },
  }),
};

const FADE: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.short3 } },
  exit: { opacity: 0, transition: { duration: DURATION.short1 } },
};

/**
 * Morphs between labels or icons inside a control, e.g. "Save" → "Saved ✓":
 * the old content rolls out, the new one rolls in, and the slot's width glides
 * to fit. Use it for the label and/or the leading icon of a Button.
 */
export function Swap({ value, children, direction = 'up', className }: SwapProps) {
  const reduce = useReducedMotion();
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  // The invisible in-flow copy gives the slot its height and target width. A
  // ResizeObserver (not a per-render measure) catches content swaps and late
  // font loads; its box sizes ignore transforms such as a parent's press scale.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      setWidth((current) => (current !== undefined && Math.abs(current - next) < WIDTH_EPSILON ? current : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.span
      initial={false}
      animate={width === undefined ? undefined : { width }}
      transition={reduce ? { duration: 0 } : SPRING_SWAP}
      className={cn('relative inline-block overflow-hidden whitespace-nowrap align-bottom', className)}
    >
      <span ref={measureRef} aria-hidden className="invisible inline-flex items-center whitespace-nowrap">
        {children}
      </span>
      <AnimatePresence initial={false} custom={direction}>
        <motion.span
          key={String(value)}
          custom={direction}
          variants={reduce ? FADE : ROLL}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-y-0 left-0 inline-flex items-center whitespace-nowrap"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
