/** The list's column names, lined up with a row's cells (type, size and time go while the details are open). */
export function ListHeader({ compact }: { compact: boolean }) {
  return (
    <div aria-hidden className="flex h-6 shrink-0 items-center gap-2 border-b border-line px-2 font-sans text-[11px] text-fg-subtle">
      <span className="w-10 shrink-0">Status</span>
      <span className="w-14 shrink-0">Method</span>
      <span className="min-w-0 flex-1">Name</span>
      {compact ? null : (
        <>
          <span className="w-20 shrink-0">Type</span>
          <span className="w-16 shrink-0 text-right">Size</span>
          <span className="w-16 shrink-0 text-right">Time</span>
        </>
      )}
    </div>
  );
}
