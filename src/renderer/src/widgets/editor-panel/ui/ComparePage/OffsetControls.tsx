import { KEY } from '@/shared/config';

export interface OffsetControlsProps {
  offset: { x: number; y: number };
  onOffset(offset: { x: number; y: number }): void;
}

/** Moving the top image by whole CSS pixels (arrow keys in a field step it, Shift by 10). */
export function OffsetControls({ offset, onOffset }: OffsetControlsProps) {
  const field = (axis: 'x' | 'y') => (
    <label className="flex items-center gap-1 text-[12px] text-fg-muted">
      {axis.toUpperCase()}
      <input
        type="number"
        step={1}
        value={offset[axis]}
        aria-label={`Move the top image ${axis === 'x' ? 'across' : 'down'} (CSS pixels)`}
        onChange={(event) => onOffset({ ...offset, [axis]: Math.round(Number(event.target.value) || 0) })}
        onKeyDown={(event) => {
          if (!event.shiftKey || (event.key !== KEY.arrowUp && event.key !== KEY.arrowDown)) return;
          event.preventDefault();
          onOffset({ ...offset, [axis]: offset[axis] + (event.key === KEY.arrowUp ? 10 : -10) });
        }}
        className="h-6 w-14 rounded-md bg-surface-raised px-1.5 font-mono text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        data-testid={`compare-offset-${axis}`}
      />
    </label>
  );
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Offset">
      {field('x')}
      {field('y')}
    </div>
  );
}
