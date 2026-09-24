import { useImperativeHandle, useRef, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/shared/lib';

export type InputSize = 'sm' | 'md';

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  /** Adornment before the text, usually `<Icon icon={SearchIcon} size={14} />`. */
  leading?: ReactNode;
  /** Adornment after the text: a <Kbd>, a count, a clear <IconButton size="sm">. */
  trailing?: ReactNode;
  /** `sm` 24 px, `md` 28 px (default). */
  size?: InputSize;
  /** Geist Mono, for URLs, patterns and code. */
  mono?: boolean;
  /** Error styling (also set by `aria-invalid`). */
  invalid?: boolean;
  /** Classes for the field frame; `className` goes there too. */
  className?: string;
  /** Classes for the <input> element itself. */
  inputClassName?: string;
}

const SIZE: Record<InputSize, string> = {
  sm: 'h-6 gap-1.5 rounded-md px-1.5 text-xs',
  md: 'h-7 gap-2 rounded-lg px-2 text-[13px]',
};

/** Adornments that handle their own clicks (a clear button, a link); clicks on anything else focus the input. */
const INTERACTIVE = 'button, a, input, select, textarea, [role="button"]';

/**
 * Text field in a raised frame with optional adornments. The frame owns the
 * focus ring (accent at 40 %); clicking an adornment that is not itself
 * interactive focuses the input. The ref points at the <input>.
 */
export function Input({
  ref,
  leading,
  trailing,
  size = 'md',
  mono = false,
  invalid,
  disabled,
  className,
  inputClassName,
  'aria-invalid': ariaInvalid,
  ...rest
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);
  const isInvalid = invalid ?? (ariaInvalid === true || ariaInvalid === 'true');

  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target === inputRef.current || target.closest(INTERACTIVE)) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <div
      onMouseDown={focusInput}
      data-invalid={isInvalid || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        'group/input flex min-w-0 cursor-text items-center border border-line bg-surface-raised text-fg-subtle',
        'transition-[border-color,box-shadow] duration-150 ease-out-expo',
        'hover:border-line-strong focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/40',
        isInvalid && 'border-danger/60 hover:border-danger/70 focus-within:border-danger/70 focus-within:ring-danger/35',
        disabled && 'pointer-events-none cursor-default opacity-50',
        SIZE[size],
        className,
      )}
    >
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <input
        ref={inputRef}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        spellCheck={mono ? false : undefined}
        className={cn(
          'h-full w-full min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-subtle',
          'focus-visible:outline-none disabled:cursor-default',
          mono && 'font-mono text-[12px] tracking-tight',
          inputClassName,
        )}
        {...rest}
      />
      {trailing ? <span className="flex shrink-0 items-center gap-1">{trailing}</span> : null}
    </div>
  );
}
