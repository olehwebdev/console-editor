import { TreeRow } from '@/shared/ui/tree';
import { useSourceTree } from '@/features/open-resource';
import type { ExplorerRowOf } from '../../lib';
import { SOURCE_FOLDER_GLYPHS } from './constants';
import type { RowProps } from './types';

const { toggle } = useSourceTree.getState();

/** A root, folder or the library group of a bundle's originals: opens and closes on click. */
export function SourceFolderRow({ row, nav }: RowProps<ExplorerRowOf<'source-folder'>>) {
  const glyph = SOURCE_FOLDER_GLYPHS[row.variant](row.expanded);
  return (
    <TreeRow
      {...nav}
      depth={row.depth}
      expanded={row.expanded}
      onToggle={() => toggle(row.key)}
      onClick={() => toggle(row.key)}
      icon={glyph.icon}
      iconClassName={glyph.className}
      label={row.label}
      meta={row.count}
      title={row.title}
      data-testid="source-folder-row"
      data-variant={row.variant}
    />
  );
}
