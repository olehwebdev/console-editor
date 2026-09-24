import { icons } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { ContextMenu } from '@/shared/ui/menu';
import { Tooltip } from '@/shared/ui/tooltip';
import { TreeLabel, TreeRow } from '@/shared/ui/tree';
import { describeFrame, KindIcon, type ResourceRow } from '@/entities/resource';
import { openResource } from '@/features/open-resource';
import { ROW_ICON_SIZE } from './constants';
import { fileMenu } from './fileMenu';
import type { RowNav } from './types';

/** A file in the tree: opens on click, with its actions on right-click and badges for iframes and overrides. */
export function FileRow({ row, selected, query, ...nav }: { row: Extract<ResourceRow, { type: 'file' }>; selected: boolean; query: string } & RowNav) {
  const { entry } = row;
  const frameLabel = describeFrame(entry);
  return (
    <ContextMenu items={fileMenu(entry)} label={`${fileName(entry.url)} actions`}>
      <TreeRow
        {...nav}
        depth={row.depth}
        selected={selected}
        icon={<KindIcon kind={entry.kind} size={ROW_ICON_SIZE} />}
        label={<TreeLabel text={row.label} highlight={query} />}
        title={`${entry.url}\n${entry.mimeType} · ${entry.status}${entry.overrideId ? ' · served from your override' : ''}${frameLabel ? `\n${frameLabel}` : ''}`}
        data-url={entry.url}
        data-testid="resource-row"
        data-iframe={entry.frame ? '' : undefined}
        className={entry.overrideId ? '[&_[data-tree-label]]:text-live' : undefined}
        onClick={() => void openResource(entry.url)}
        trailing={
          <span className="flex items-center gap-1.5">
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
