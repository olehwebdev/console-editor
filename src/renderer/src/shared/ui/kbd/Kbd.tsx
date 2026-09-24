import { cn, keyLabel } from '@/shared/lib';

export interface KbdProps {
  /** e.g. ['mod', 'S'] renders ⌘ S on macOS and Ctrl S elsewhere. */
  keys: string[];
  className?: string;
}

export function Kbd({ keys, className }: KbdProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-line bg-surface-raised px-1 font-sans text-[10.5px] font-medium leading-none text-fg-muted"
        >
          {keyLabel(key)}
        </kbd>
      ))}
    </span>
  );
}
