import { icons } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { Icon } from '@/shared/ui/icon';
import { ContextMenu } from '@/shared/ui/menu';
import { Tooltip } from '@/shared/ui/tooltip';
import { TreeLabel, TreeRow } from '@/shared/ui/tree';
import { describeFrame, KindIcon } from '@/entities/resource';
import { isMappableKind } from '@/entities/source-map';
import { openResource, toggleBundleSources } from '@/features/open-resource';
import type { ExplorerFileRow } from '../../lib';
import { ROW_ICON_SIZE } from '../constants';
import { fileMenu } from './fileMenu';
import type { RowProps } from './types';

/**
 * A file in the tree: opens on click, with its actions on right-click and badges for iframes and
 * overrides. A script or stylesheet opens onto its originals (chevron, →), loading its map.
 */
export function FileRow({ row, context, nav }: RowProps<ExplorerFileRow>) {
  const { entry, nest } = row;
  const { kind } = entry;
  const frameLabel = describeFrame(entry);
  const toggle = nest && isMappableKind(kind) ? () => void toggleBundleSources(entry.url, kind) : undefined;
  return (
    <ContextMenu items={fileMenu(entry, nest)} label={`${fileName(entry.url)} actions`}>
      <TreeRow
        {...nav}
        depth={row.depth}
        expanded={row.expanded}
        onToggle={toggle}
        selected={entry.url === context.activeUrl}
        aria-busy={nest?.status === 'loading' || undefined}
        icon={<KindIcon kind={kind} size={ROW_ICON_SIZE} />}
        label={<TreeLabel text={row.label} highlight={context.query} />}
        meta={nest?.count ?? undefined}
        title={`${entry.url}\n${entry.mimeType} · ${entry.status}${entry.overrideId ? ' · served from your override' : ''}${frameLabel ? `\n${frameLabel}` : ''}`}
        data-url={entry.url}
        data-testid="resource-row"
        data-iframe={entry.frame ? '' : undefined}
        data-source-map={nest?.status}
        className={entry.overrideId ? '[&_[data-tree-label]]:text-live' : undefined}
        onClick={() => void openResource(entry.url)}
        trailing={
          <span className="flex items-center gap-1.5">
            {nest?.failure ? (
              <Tooltip content={`Couldn't read the source map. ${nest.failure}`}>
                <span role="img" aria-label="Source map failed" className="grid place-items-center">
                  <Icon icon={icons.WarningIcon} size={12} className="text-warning" />
                </span>
              </Tooltip>
            ) : null}
            {frameLabel ? (
              <Tooltip content={frameLabel}>
                <Badge tone="info" icon={icons.IframeIcon} aria-label={frameLabel} className="frame-badge">
                  iframe
                </Badge>
              </Tooltip>
            ) : null}
            {entry.overrideId ? (
              <Tooltip content="Served from your override">
                <span aria-label="Overridden" className="size-1.5 rounded-full bg-live shadow-[0_0_8px_var(--live)]" />
              </Tooltip>
            ) : null}
          </span>
        }
      />
    </ContextMenu>
  );
}
