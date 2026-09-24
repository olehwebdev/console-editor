// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { cva, type VariantProps } from 'class-variance-authority';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';
import { cn, DURATION, EASE_OUT, SPRING_PRESS } from '@/shared/lib';
import { Spinner } from '@/shared/ui/spinner';

/** Native handlers whose signatures motion redefines on motion.* elements. */
type MotionConflicts = 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

/**
 * Class recipe of the button, for elements that must look like one without
 * being a <Button> (e.g. a <label> for a file input).
 */
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap border font-medium',
    'outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
    'transition-[color,background-color,border-color,box-shadow,filter,opacity] duration-150 ease-out-expo',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-accent-grad text-accent-fg shadow-raised hover:brightness-110 active:brightness-95 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
        secondary: 'border-line bg-hover text-fg hover:border-line-strong hover:bg-pressed',
        ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-hover hover:text-fg active:bg-pressed',
        danger: 'border-danger/25 bg-danger/12 text-danger hover:border-danger/40 hover:bg-danger/20',
      },
      size: {
        sm: 'h-6 gap-1 rounded-md px-2 text-xs',
        md: 'h-7 gap-1.5 rounded-lg px-2.5 text-[13px]',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, MotionConflicts>, VariantProps<typeof buttonVariants> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Slot before the label, usually `<Icon size={14} />` (sm) or `<Icon />` (md). */
  leading?: ReactNode;
  /** Slot after the label (icon, <Kbd>, <Counter>). */
  trailing?: ReactNode;
  /**
   * Busy state: the leading slot swaps to a spinner (or, without one, the
   * content fades behind a centered spinner, so the width never jumps).
   * Clicks are ignored and `aria-busy` is set; focus is kept.
   */
  loading?: boolean;
}

/**
 * The design-system button: 28 px (md) / 24 px (sm), press spring, primary on
 * the ember gradient with dark text. Pair with <Swap> (same folder) to morph
 * its label or leading icon, e.g. "Save" → "Saved ✓".
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  leading,
  trailing,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const reduce = useReducedMotion();
  const iconSize = size === 'sm' ? 12 : 14;
  const overlaySpinner = loading && !leading;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      whileTap={reduce || loading || disabled ? undefined : { scale: 0.97 }}
      transition={SPRING_PRESS}
      onClick={handleClick}
      className={cn(buttonVariants({ variant, size }), loading && 'cursor-progress', className)}
      {...rest}
    >
      <span
        className={cn(
          'inline-flex min-w-0 items-center gap-[inherit] transition-opacity duration-150',
          overlaySpinner && 'opacity-0',
        )}
      >
        {leading ? (
          // Icon and spinner share one grid cell, so the crossfade never shifts the label.
          <span className="inline-grid shrink-0 place-items-center [&>*]:[grid-area:1/1]">
            <AnimatePresence initial={false}>
              <motion.span
                key={loading ? 'spinner' : 'leading'}
                className="inline-flex"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              >
                {loading ? <Spinner size={iconSize} /> : leading}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : null}
        {children !== undefined && children !== null && children !== false ? (
          <span className="min-w-0 truncate">{children}</span>
        ) : null}
        {trailing ? <span className="inline-flex shrink-0 items-center">{trailing}</span> : null}
      </span>
      <AnimatePresence initial={false}>
        {overlaySpinner ? (
          <motion.span
            key="spinner"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
          >
            <Spinner size={iconSize} />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}
