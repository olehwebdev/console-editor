import type { ReactNode } from 'react';
import { KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Input } from '@/shared/ui/input';
import { DIGITS } from '../../model';

interface NumberFieldProps {
  value: string;
  label: string;
  invalid: boolean;
  onChange(value: string): void;
  onEnter(): void;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  testId: string;
}

/** A whole number typed in a small field: anything but digits is ignored as it is typed. */
export function NumberField({ value, label, invalid, onChange, onEnter, leading, trailing, className, testId }: NumberFieldProps) {
  return (
    <Input
      size="sm"
      mono
      inputMode="numeric"
      value={value}
      invalid={invalid}
      aria-label={label}
      title={label}
      leading={leading}
      trailing={trailing}
      data-testid={testId}
      className={cn('shrink-0', className)}
      onChange={(e) => DIGITS.test(e.target.value) && onChange(e.target.value)}
      onKeyDown={(e) => e.key === KEY.enter && onEnter()}
    />
  );
}
