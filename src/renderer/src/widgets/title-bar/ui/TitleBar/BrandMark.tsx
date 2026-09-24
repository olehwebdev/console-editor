/** The app's `{}` mark at the start of the title bar. */
export function BrandMark() {
  return (
    <span className="relative flex size-6 items-center justify-center rounded-[7px] bg-accent-grad shadow-[0_2px_12px_-2px_color-mix(in_oklch,var(--accent)_60%,transparent)]">
      <span className="font-mono text-[11px] font-bold leading-none text-accent-fg">{'{}'}</span>
    </span>
  );
}
