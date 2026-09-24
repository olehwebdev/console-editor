import { cn } from '@/shared/lib';

/** The grip's three dots. */
const GRIP_DOTS = [0, 1, 2];

/**
 * The grip: a tab over the panel's border (the pixel past the centre) that bulges out before it, never
 * past it: what lies further can be hidden (the page's native view starts there; the sidebar clips its
 * edge). Part of the handle, so it can be grabbed too.
 */
export function ResizerGrip({ vertical, disabled }: { vertical: boolean; disabled: boolean }) {
  return (
    <span
      aria-hidden
      data-grip
      className={cn(
        'absolute flex items-center justify-center gap-[3px] border-line-strong bg-surface-raised text-fg-muted',
        'transition-[color,border-color] duration-150 ease-out-expo',
        vertical
          ? 'right-[calc(50%-1px)] top-1/2 -mt-3 h-6 w-[7px] flex-col rounded-l-full border border-r-0'
          : 'bottom-[calc(50%-1px)] left-1/2 -ml-3 h-[7px] w-6 flex-row rounded-t-full border border-b-0',
        'group-hover/resizer:border-accent group-hover/resizer:text-fg group-hover/resizer:delay-200',
        'group-focus-visible/resizer:border-accent group-focus-visible/resizer:text-fg group-focus-visible/resizer:delay-0',
        'group-data-[dragging]/resizer:border-accent group-data-[dragging]/resizer:text-fg group-data-[dragging]/resizer:delay-0',
        disabled && 'opacity-40',
      )}
    >
      {GRIP_DOTS.map((dot) => (
        <span key={dot} className="size-0.5 shrink-0 rounded-full bg-current" />
      ))}
    </span>
  );
}
