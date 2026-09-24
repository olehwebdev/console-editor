import { cn } from '@/shared/lib';

/** The 2 px accent line: lights up on hover (after a short intent delay), while dragging and on keyboard focus. */
export function ResizerAccentLine({ vertical }: { vertical: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute bg-accent opacity-0 transition-opacity duration-150 ease-out-expo',
        vertical ? 'inset-y-0 left-1/2 w-0.5 -translate-x-1/2' : 'inset-x-0 top-1/2 h-0.5 -translate-y-1/2',
        'group-hover/resizer:opacity-100 group-hover/resizer:delay-200',
        'group-focus-visible/resizer:opacity-100 group-focus-visible/resizer:delay-0',
        'group-data-[dragging]/resizer:opacity-100 group-data-[dragging]/resizer:delay-0',
      )}
    />
  );
}
