export function DownloadProgress({ percent }: { percent: number }) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <span className="text-[12.5px] text-fg-muted" aria-hidden>
        Downloading… {percent}%
      </span>
      {/* A progress bar rather than live text, which would be read out at every percent. */}
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-hover"
        role="progressbar"
        aria-label="Downloading the update"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
