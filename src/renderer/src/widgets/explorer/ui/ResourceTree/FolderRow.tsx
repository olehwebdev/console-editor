import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { TreeRow } from '@/shared/ui/tree';
import type { ExplorerRowOf } from '../../lib';
import { ROW_ICON_SIZE } from '../constants';
import type { RowProps } from './types';

/** An origin or folder of the page's files: opens and closes on click. */
export function FolderRow({ row, context, nav }: RowProps<ExplorerRowOf<'origin' | 'folder'>>) {
  const origin = row.type === 'origin';
  return (
    <TreeRow
      {...nav}
      depth={row.depth}
      expanded={row.expanded}
      onToggle={() => context.toggleFolder(row.key)}
      onClick={() => context.toggleFolder(row.key)}
      icon={<Icon icon={origin ? icons.GlobeIcon : row.expanded ? icons.FolderOpenIcon : icons.FolderIcon} size={ROW_ICON_SIZE} className={origin ? 'text-info' : 'text-fg-subtle'} />}
      label={<span className={origin ? 'font-medium text-fg' : undefined}>{row.label}</span>}
      meta={<span className="tabular-nums text-fg-subtle">{row.count}</span>}
      title={row.type === 'origin' ? row.origin : row.label}
    />
  );
}
