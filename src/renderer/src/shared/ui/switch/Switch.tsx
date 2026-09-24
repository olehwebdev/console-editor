// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib';

// Heavy, deliberate thumb: high mass keeps the travel weighty without wobble.
const THUMB_SPRING = { type: 'spring', stiffness: 800, damping: 80, mass: 4 } as const;

export type SwitchSize = 'sm' | 'md';
export type SwitchTone = 'live' | 'accent';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** `sm` 14×24 px, `md` 18×32 px (default). */
  size?: SwitchSize;
  /** Track color when on: `live` lime (overrides, serving) or `accent` ember (settings). Default `accent`. */
  tone?: SwitchTone;
  disabled?: boolean;
  /** Visible label, rendered after the switch and wired with htmlFor. */
  label?: ReactNode;
  /** Accessible name when there is no visible label. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  id?: string;
  name?: string;
  title?: string;
  className?: string;
}

const TRACK: Record<SwitchSize, string> = {
  sm: 'h-3.5 w-6 p-0.5',
  md: 'h-[18px] w-8 p-0.5',
};

const THUMB: Record<SwitchSize, string> = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3.5 w-3.5',
};

// While pressed, the thumb stretches toward where it is about to go.
const STRETCH: Record<SwitchSize, string> = {
  sm: 'w-3',
  md: 'w-[18px]',
};

const TONE_ON: Record<SwitchTone, string> = {
  live: 'bg-live',
  accent: 'bg-accent',
};

/**
 * Toggle with beUI's weighted thumb: a heavy spring glides it across, and it
 * stretches toward its destination while pressed. `role="switch"`, operable
 * with Space/Enter; a pressed disabled switch gives a small refusal shake.
 */
export function Switch({
  checked,
  onCheckedChange,
  size = 'md',
  tone = 'accent',
  disabled = false,
  label,
  id: idProp,
  className,
  ...aria
}: SwitchProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const reduce = useReducedMotion();
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [pressed, setPressed] = useState(false);

  // Refusal shake when a disabled switch is pressed.
  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb || reduce || !disabled || !pressed) return;
    const controls = animate(thumb, { x: [0, -2, 2, -1, 0] }, { duration: 0.3 });
    return () => controls.stop();
  }, [disabled, pressed, reduce]);

  const squish = pressed && !disabled && !reduce;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        data-state={checked ? 'checked' : 'unchecked'}
        onClick={() => {
          if (!disabled) onCheckedChange(!checked);
        }}
        onPointerDown={(event) => {
          if (event.button === 0) setPressed(true);
        }}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        className={cn(
          'group relative inline-flex shrink-0 items-center rounded-full outline-none',
          'transition-[background-color,box-shadow] duration-200 ease-out-expo',
          'focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
          checked ? cn('justify-end', TONE_ON[tone]) : 'justify-start bg-pressed shadow-[inset_0_0_0_1px_var(--line-strong)]',
          disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
          TRACK[size],
        )}
        {...aria}
      >
        <motion.span
          ref={thumbRef}
          layout
          transition={reduce ? { duration: 0 } : THUMB_SPRING}
          className={cn(
            'pointer-events-none block rounded-full shadow-raised transition-colors duration-200',
            checked ? 'bg-canvas' : 'bg-fg-muted',
            THUMB[size],
            squish && STRETCH[size],
          )}
        />
      </button>
      {label ? (
        <label
          htmlFor={id}
          className={cn('select-none text-[13px] text-fg', disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer')}
        >
          {label}
        </label>
      ) : null}
    </span>
  );
}
