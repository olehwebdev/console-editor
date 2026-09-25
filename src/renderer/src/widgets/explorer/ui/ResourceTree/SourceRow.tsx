import { fileName } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { ContextMenu } from '@/shared/ui/menu';
import { Tooltip } from '@/shared/ui/tooltip';
import { TreeLabel, TreeRow } from '@/shared/ui/tree';
import { cleanLabel, SourceIcon, sourceKey } from '@/entities/source-map';
import { openOriginalSource } from '@/features/open-resource';
import type { ExplorerRowOf } from '../../lib';
import { ROW_ICON_SIZE } from '../constants';
import { sourceMenu } from './sourceMenu';
import type { RowProps } from './types';

/** An original file of a bundle: opens read-only on click (or Enter, Space). */
export function SourceRow({ row, context, nav }: RowProps<ExplorerRowOf<'source'>>) {
  const { bundleUrl, bundleKind, source } = row;
  return (
    <ContextMenu items={sourceMenu(row)} label={`${row.label} actions`}>
      <TreeRow
        {...nav}
        depth={row.depth}
        selected={sourceKey(bundleUrl, source.url) === context.activeSourceKey}
        icon={<SourceIcon file={row.label} size={ROW_ICON_SIZE} />}
        label={<TreeLabel text={row.label} highlight={context.query} />}
        title={`${cleanLabel(source.url)}\nOriginal source${source.library ? ', third-party' : ''} · from ${fileName(bundleUrl)}`}
        data-testid="source-row"
        data-source-url={source.url}
        data-bundle-url={bundleUrl}
        onClick={() => void openOriginalSource(bundleUrl, bundleKind, source.url)}
        trailing={
          source.hasContent ? null : (
            <Tooltip content="The source map lists this file without its text">
              <Badge>no text</Badge>
            </Tooltip>
          )
        }
      />
    </ContextMenu>
  );
}
