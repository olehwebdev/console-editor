import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';

/** A file row's trailing slot: a Compare button shown on hover, and a dot when the file is served from an override. */
export function FileActions({ live }: { live?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <IconButton
        icon={icons.DiffIcon}
        label="Compare"
        size="sm"
        noTooltip
        tabIndex={-1}
        className="size-5 opacity-0 transition-opacity group-hover/tree-row:opacity-100"
      />
      {live ? (
        <span aria-label="Served from your override" role="img" className="size-1.5 rounded-full bg-live shadow-[0_0_8px_var(--live)]" />
      ) : null}
    </span>
  );
}
