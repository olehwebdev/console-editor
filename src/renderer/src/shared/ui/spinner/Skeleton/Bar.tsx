import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib';

// A light band sweeping across the bar. Animating the full `transform` string
// lets motion hand it to WAAPI, so the sweep runs on the compositor.
const SWEEP = { transform: ['translateX(-100%)', 'translateX(100%)'] };
const SWEEP_TRANSITION = { duration: 1.6, ease: 'linear', repeat: Infinity } as const;

export function Bar({ className, style }: { className?: string; style?: CSSProperties }) {
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
