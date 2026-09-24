import { motion, useReducedMotion } from 'motion/react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn, ICON_PRESS_SCALE, SPRING_PRESS } from '@/shared/lib';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { Tooltip, type TooltipSide } from '@/shared/ui/tooltip';
import { ariaShortcut } from './ariaShortcut';

type MotionConflicts = 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd';

export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, MotionConflicts | 'children'> {
  icon: IconGlyph;
  /** Accessible name and tooltip text. */
  label: string;
  /** Toggled / current state: accent tint, and `aria-pressed` unless you pass your own. */
  active?: boolean;
  /** `sm` 24 px, `md` 28 px (default), `lg` 36 px with an 18 px glyph (activity rail). */
  size?: IconButtonSize;
  /** Shortcut shown in the tooltip and exposed as `aria-keyshortcuts`, e.g. `['mod', 'S']`. */
  shortcut?: string[];
  /**
   * Preferred tooltip side. Default `top`, like Tooltip. The tooltip still flips at the
   * window edge and away from the native page view (see `setNativeViewRect` in shared/lib).
   */
  tooltipSide?: TooltipSide;
  /** Hide the tooltip (the label stays the accessible name). */
  noTooltip?: boolean;
  /** Tint the glyph red on hover, for destructive actions. */
  danger?: boolean;
  /** Small overlay in the top-right corner, e.g. a live dot or a count. */
  badge?: ReactNode;
}

const SIZE: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: 'size-6 rounded-md', icon: 14 },
  md: { box: 'size-7 rounded-lg', icon: 16 },
  lg: { box: 'size-9 rounded-xl', icon: 18 },
};

/**
 * Square icon-only button (28 px) with its label in a tooltip. Press spring,
 * hover wash, accent tint when `active`.
 */
export function IconButton({
  icon,
  label,
  active,
  size = 'md',
  shortcut,
  tooltipSide = 'top',
  noTooltip = false,
  danger = false,
  badge,
  disabled,
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  const reduce = useReducedMotion();
  const dims = SIZE[size];

  const button = (
    <motion.button
      type={type}
      aria-label={label}
      aria-pressed={active}
      aria-keyshortcuts={shortcut?.length ? ariaShortcut(shortcut) : undefined}
      disabled={disabled}
      data-active={active || undefined}
      whileTap={reduce || disabled ? undefined : { scale: ICON_PRESS_SCALE }}
      transition={SPRING_PRESS}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center text-fg-muted outline-none',
        'transition-[color,background-color,opacity] duration-150 ease-out-expo',
        'hover:bg-hover hover:text-fg active:bg-pressed focus-visible:ring-2 focus-visible:ring-accent/50',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent/12 text-accent hover:bg-accent/18 hover:text-accent',
        danger && 'hover:bg-danger/12 hover:text-danger',
        dims.box,
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={dims.icon} />
      {badge ? <span className="pointer-events-none absolute right-0.5 top-0.5 flex">{badge}</span> : null}
    </motion.button>
  );

  return (
    <Tooltip content={label} shortcut={shortcut} side={tooltipSide} disabled={noTooltip} describeTrigger={false}>
      {button}
    </Tooltip>
  );
}
