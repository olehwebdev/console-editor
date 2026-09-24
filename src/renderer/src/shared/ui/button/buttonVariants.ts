// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { cva } from 'class-variance-authority';

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
