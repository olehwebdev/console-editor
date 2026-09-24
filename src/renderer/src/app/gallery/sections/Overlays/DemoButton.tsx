import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib';

/** Plain token-styled button (the shared Button lands separately). */
export function DemoButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg bg-surface-raised px-3 text-[13px] font-medium text-fg shadow-raised transition-colors hover:bg-pressed data-[state=open]:bg-pressed',
        className,
      )}
    />
  );
}
