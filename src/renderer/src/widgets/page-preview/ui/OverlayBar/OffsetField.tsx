export interface OffsetFieldProps {
  axis: 'x' | 'y';
  value: number;
  onChange(value: number): void;
}

/** Where the design is across or down, in whole CSS pixels. */
export function OffsetField({ axis, value, onChange }: OffsetFieldProps) {
  return (
    <label className="flex items-center gap-1 text-[12px] text-fg-muted">
      {axis.toUpperCase()}
      <input
        type="number"
        step={1}
        value={value}
        aria-label={axis === 'x' ? 'Move the design across (CSS pixels)' : 'Move the design down (CSS pixels)'}
        onChange={(event) => onChange(Math.round(Number(event.target.value) || 0))}
        className="h-6 w-14 rounded-md bg-surface-raised px-1.5 font-mono text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        data-testid={`overlay-${axis}`}
      />
    </label>
  );
}
