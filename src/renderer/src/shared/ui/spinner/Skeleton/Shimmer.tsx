import type { ElementType, ReactNode } from 'react';
import { cn } from '@/shared/lib';

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
