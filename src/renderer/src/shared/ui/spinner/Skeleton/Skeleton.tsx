import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib';
import { Bar } from './Bar';

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
