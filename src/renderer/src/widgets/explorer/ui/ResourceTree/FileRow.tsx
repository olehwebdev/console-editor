import { icons } from '@/shared/config';
import { cn, fileName } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { Icon } from '@/shared/ui/icon';
import { ContextMenu } from '@/shared/ui/menu';
import { Tooltip } from '@/shared/ui/tooltip';
import { TreeLabel, TreeRow } from '@/shared/ui/tree';
import { describeFrame, describeWorker, KindIcon, WORKER_NAME } from '@/entities/resource';
import { isMappableKind } from '@/entities/source-map';
import { openResource, toggleBundleSources } from '@/features/open-resource';
import type { ExplorerFileRow } from '../../lib';
import { ROW_ICON_SIZE } from '../constants';
import { fileMenu } from './fileMenu';
import type { RowProps } from './types';

/**
 * A file in the tree: opens on click, with its actions on right-click and badges for iframes, workers,
 * overrides and blocked requests. A script or stylesheet opens onto its originals (chevron, →), loading its map.
 */
export function FileRow({ row, context, nav }: RowProps<ExplorerFileRow>) {
  const { entry, nest } = row;
  const { kind } = entry;
  const frameLabel = describeFrame(entry);
  const workerLabel = describeWorker(entry);
  const blocked = !!entry.blockedBy;
  const received = blocked ? 'Blocked by a rule: the page never received it' : `${entry.mimeType} · ${entry.status}${entry.overrideId ? ' · served from your override' : ''}`;
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
        title={`${entry.url}\n${received}${frameLabel ? `\n${frameLabel}` : ''}${workerLabel ? `\n${workerLabel}` : ''}`}
        data-url={entry.url}
        data-testid="resource-row"
        data-iframe={entry.frame ? '' : undefined}
        data-worker={entry.worker?.type}
        data-source-map={nest?.status}
        data-blocked={blocked ? '' : undefined}
        className={cn(
          entry.overrideId && '[&_[data-tree-label]]:text-live',
          blocked && '[&_[data-tree-label]]:text-fg-subtle [&_[data-tree-label]]:line-through [&_[data-tree-label]]:decoration-fg-subtle/60',
        )}
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
            {workerLabel && entry.worker ? (
              <Tooltip content={workerLabel}>
                <Badge tone="info" icon={icons.WorkerIcon} aria-label={workerLabel} className="worker-badge">
                  {WORKER_NAME[entry.worker.type]}
                </Badge>
              </Tooltip>
            ) : null}
            {blocked ? (
              <Badge tone="danger" icon={icons.BlockIcon}>
                blocked
              </Badge>
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
