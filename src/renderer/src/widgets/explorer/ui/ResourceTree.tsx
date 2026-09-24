import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';
import type { ResourceEntry } from '@common/types';
import { icons } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { HoverHighlight } from '@/shared/ui/hover-highlight';
import { Icon } from '@/shared/ui/icon';
import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { Tooltip } from '@/shared/ui/tooltip';
import { TreeLabel, TreeRow } from '@/shared/ui/tree';
import { selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { buildResourceRows, describeFrame, KindIcon, uniqueResources, useResourceStore, type ResourceRow } from '@/entities/resource';
import { useResourceFilter } from '@/features/filter-resources';
import { openResource } from '@/features/open-resource';

const ROW_HEIGHT = 26;

function fileMenu(entry: ResourceEntry): MenuItem[] {
  return [
    { label: entry.overrideId ? 'Open override' : 'Open', icon: icons.FileIcon, onSelect: () => void openResource(entry.url) },
    { label: 'Copy URL', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(entry.url) },
    ...(entry.frame ? [{ label: 'Copy iframe URL', icon: icons.IframeIcon, onSelect: () => void navigator.clipboard.writeText(entry.frame!.url) }] : []),
  ];
}

function FileRow({ row, selected, query }: { row: Extract<ResourceRow, { type: 'file' }>; selected: boolean; query: string }) {
  const { entry } = row;
  const frameLabel = describeFrame(entry);
  return (
    <ContextMenu items={fileMenu(entry)} label={`${fileName(entry.url)} actions`}>
      <TreeRow
        depth={row.depth}
        selected={selected}
        icon={<KindIcon kind={entry.kind} size={14} />}
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

/**
 * Files the page loaded, as origin → folder → file. Virtualized: pages with
 * thousands of chunks stay smooth. Components subscribe to narrow slices only.
 */
export function ResourceTree() {
  const byKey = useResourceStore((s) => s.byKey);
  const query = useResourceFilter((s) => s.query.trim());
  const activeUrl = useTabStore((s) => {
    const tab = selectActiveTab(s);
    return tab ? tab.url : null;
  });
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const entries = useMemo(() => uniqueResources(byKey), [byKey]);
  const rows = useMemo(() => buildResourceRows(entries, query, collapsed), [entries, query, collapsed]);

  const scroller = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => scroller.current, estimateSize: () => ROW_HEIGHT, overscan: 12 });

  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (!entries.length) {
    return (
      <EmptyState icon={icons.ExplorerIcon} title="No files yet" className="py-8">
        Scripts, stylesheets and HTML the page loads show up here, including the ones inside iframes.
      </EmptyState>
    );
  }
  if (!rows.length) {
    return <p className="px-4 py-3 text-[12px] text-fg-subtle">No files match “{query}”.</p>;
  }

  return (
    <div ref={scroller} className="h-full overflow-y-auto overflow-x-hidden" data-testid="resource-tree">
      <HoverHighlight className="relative px-1.5" role="tree" aria-label="Page resources" style={{ height: virtual.getTotalSize() }}>
        {virtual.getVirtualItems().map((item) => {
          const row = rows[item.index];
          return (
            <div key={row.key} className="absolute inset-x-1.5" style={{ top: 0, transform: `translateY(${item.start}px)`, height: ROW_HEIGHT }}>
              {row.type === 'file' ? (
                <FileRow row={row} selected={row.entry.url === activeUrl} query={query} />
              ) : (
                <TreeRow
                  depth={row.depth}
                  expanded={row.expanded}
                  onToggle={() => toggle(row.key)}
                  onClick={() => toggle(row.key)}
                  icon={<Icon icon={row.type === 'origin' ? icons.GlobeIcon : row.expanded ? icons.FolderOpenIcon : icons.FolderIcon} size={14} className={row.type === 'origin' ? 'text-info' : 'text-fg-subtle'} />}
                  label={<span className={row.type === 'origin' ? 'font-medium text-fg' : undefined}>{row.label}</span>}
                  meta={<span className="tabular-nums text-fg-subtle">{row.count}</span>}
                  title={row.type === 'origin' ? row.origin : row.label}
                />
              )}
            </div>
          );
        })}
      </HoverHighlight>
    </div>
  );
}

export function useResourceCount(): number {
  const byKey = useResourceStore((s) => s.byKey);
  return useMemo(() => uniqueResources(byKey).length, [byKey]);
}
