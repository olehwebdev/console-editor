import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cn } from '@/shared/lib';

export interface SkeletonProps {
  /** Render a paragraph of `lines` bars (the last one shorter). Default 1. */
  lines?: number;
  /**
   * Size with utilities, e.g. `h-3 w-40`. Default bar is `h-3 w-full`. With `lines > 1`
   * it sizes the paragraph wrapper instead (bars stay 12 px tall, the last one 60 % wide).
   */
  className?: string;
  style?: CSSProperties;
}

// A light band sweeping across the bar. Animating the full `transform` string
// lets motion hand it to WAAPI, so the sweep runs on the compositor.
const SWEEP = { transform: ['translateX(-100%)', 'translateX(100%)'] };
const SWEEP_TRANSITION = { duration: 1.6, ease: 'linear', repeat: Infinity } as const;

function Bar({ className, style }: { className?: string; style?: CSSProperties }) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className={cn('relative block h-3 w-full overflow-hidden rounded-md bg-hover', className)} style={style}>
      {reduce ? null : (
        <motion.span
          className="absolute inset-0 bg-linear-to-r from-transparent via-hover to-transparent"
          initial={{ transform: 'translateX(-100%)' }}
          animate={SWEEP}
          transition={SWEEP_TRANSITION}
        />
      )}
    </span>
  );
}

/** Placeholder bar(s) for content that is still loading. Decorative (`aria-hidden`). */
export function Skeleton({ lines = 1, className, style }: SkeletonProps) {
  if (lines <= 1) return <Bar className={className} style={style} />;
  return (
    <span aria-hidden className={cn('flex w-full flex-col gap-2', className)} style={style}>
      {Array.from({ length: lines }, (_, i) => (
        <Bar key={i} className={i === lines - 1 ? 'w-3/5' : undefined} />
      ))}
    </span>
  );
}

export interface ShimmerProps {
  children: ReactNode;
  /** Element to render. Default `span`. */
  as?: ElementType;
  className?: string;
}

/**
 * Text with a light sweeping through it, for in-progress labels such as
 * "Pretty-printing…". Uses the global `.shimmer-text` class; static under reduced motion.
 */
export function Shimmer({ children, as: Component = 'span', className }: ShimmerProps) {
  return <Component className={cn('shimmer-text inline-block motion-reduce:[animation:none]', className)}>{children}</Component>;
}
