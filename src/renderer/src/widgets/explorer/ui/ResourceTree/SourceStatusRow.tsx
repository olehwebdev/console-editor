import { cn } from '@/shared/lib';
import { TreeRow } from '@/shared/ui/tree';
import type { ExplorerRowOf } from '../../lib';
import { SOURCE_STATUS_LOOKS } from './constants';
import type { RowProps } from './types';

/** A line under a bundle whose originals can't be listed: its map is loading, failed (retry), or lists none. */
export function SourceStatusRow({ row, nav }: RowProps<ExplorerRowOf<'source-status'>>) {
  const { icon, className, action } = SOURCE_STATUS_LOOKS[row.status];
  return (
    <TreeRow
      {...nav}
      depth={row.depth}
      icon={icon}
      label={<span className={cn('text-[12px]', className)}>{row.message}</span>}
      trailing={action ? <span className="text-[12px] font-medium text-accent">{action.label}</span> : null}
      title={row.message}
      aria-busy={row.status === 'loading' || undefined}
      data-testid="source-status"
      data-status={row.status}
      onClick={action ? () => action.run(row.bundleUrl, row.bundleKind) : undefined}
    />
  );
}
