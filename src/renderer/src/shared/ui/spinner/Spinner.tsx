// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib';

export interface SpinnerProps {
  /** Diameter in px. Default 14 (inline); use 16 next to 16 px icons. */
  size?: number;
  /**
   * Accessible label. When set the spinner is a `role="status"` region; leave it
   * unset when the surrounding control already says it is busy (e.g. `aria-busy`).
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** The default diameter (px), for inline use; spinners this small get a thinner ring. */
const INLINE_SIZE = 14;

/**
 * Small ring spinner in `currentColor`. Rotation is a CSS animation on the
 * compositor (no JS per frame); with reduced motion it gently pulses instead.
 */
export function Spinner({ size = INLINE_SIZE, label, className, style }: SpinnerProps) {
  const stroke = size <= INLINE_SIZE ? 1.5 : 2;
  const r = (size - stroke) / 2;
  const c = size / 2;
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size, ...style }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        className="animate-spin-slow motion-reduce:animate-pulse"
      >
        <circle cx={c} cy={c} r={r} stroke="currentColor" strokeOpacity={0.22} strokeWidth={stroke} />
        <path
          d={`M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c + r} ${c}`}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
