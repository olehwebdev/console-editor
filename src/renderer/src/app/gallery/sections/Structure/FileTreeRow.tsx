import { icons } from '@/shared/config';
import { TreeLabel, TreeRow } from '@/shared/ui/tree';
import { KIND } from './constants';
import { FileActions } from './FileActions';
import type { FlatRow } from './types';

const { FolderIcon, FolderOpenIcon, GlobeIcon } = icons;

export interface FileTreeRowProps {
  row: FlatRow;
  /** The id of the selected file. */
  selected: string;
  /** The normalized filter, highlighted in file names. */
  query: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

/** One origin, folder or file of the file tree demo: origins and folders toggle and show their file count, files select. */
export function FileTreeRow({ row: { node, depth, expanded: open, count }, selected, query, onToggle, onSelect }: FileTreeRowProps) {
  const file = !node.children;
  const kind = node.kind ? KIND[node.kind] : null;
  return (
    <TreeRow
      depth={depth}
      expanded={open}
      onToggle={file ? undefined : () => onToggle(node.id)}
      selected={file && node.id === selected}
      icon={node.origin ? GlobeIcon : kind ? kind.glyph : open ? FolderOpenIcon : FolderIcon}
      iconClassName={node.origin ? 'text-info' : kind ? kind.tint : 'text-fg-subtle'}
      label={
        file ? (
          <TreeLabel text={node.name} highlight={query} className={node.live ? 'text-live' : undefined} />
        ) : (
          <span className={node.origin ? 'font-medium text-fg' : undefined}>{node.name}</span>
        )
      }
      meta={file ? undefined : count}
      title={node.name}
      onClick={file ? () => onSelect(node.id) : undefined}
      trailing={file ? <FileActions live={node.live} /> : undefined}
    />
  );
}
