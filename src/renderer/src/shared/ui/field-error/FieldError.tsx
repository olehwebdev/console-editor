import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib';

export interface FieldErrorProps extends ComponentProps<'p'> {
  /** What the invalid fields' `aria-describedby` names. */
  id: string;
  /** Nothing shows without one. */
  message?: string;
}

/** What is wrong with a field (or a form), under it. Announced as it appears; the fields it is about point at it. */
export function FieldError({ id, message, className, ...rest }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn('text-[12px] leading-snug text-danger', className)} {...rest}>
      {message}
    </p>
  );
}
