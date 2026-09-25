import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';

/**
 * A file's root (a host, a source root) and path, the file last. Short of room, the root and folders
 * give way first, so the file name stays readable (narrow windows skip the folders).
 */
export function Breadcrumbs({ root, segments, title }: { root: string; segments: readonly string[]; title: string }) {
  return (
    <nav aria-label="File location" className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[12.5px]" title={title}>
      <span className="min-w-0 shrink-[100] truncate text-fg-subtle">{root}</span>
      {segments.map((segment, i) => (
        <span
          key={i}
          className={
            i === segments.length - 1
              ? 'flex min-w-0 items-center gap-1 text-fg'
              : 'hidden min-w-0 shrink-[100] items-center gap-1 overflow-hidden text-fg-subtle sm:flex'
          }
        >
          <Icon icon={icons.ChevronRightIcon} size={12} className="shrink-0 text-fg-subtle/60" />
          <span className={i === segments.length - 1 ? 'truncate font-medium' : 'truncate'}>{segment}</span>
        </span>
      ))}
    </nav>
  );
}
