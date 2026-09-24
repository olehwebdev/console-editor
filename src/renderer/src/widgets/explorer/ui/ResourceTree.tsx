import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ResourceEntry } from '@common/types';
import { icons } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { HoverHighlight } from '@/shared/ui/hover-highlight';
import { Icon } from '@/shared/ui/icon';
import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { Tooltip } from '@/shared/ui/tooltip';
import { TreeLabel, TreeRow, treeKeyTarget, treePositions, type TreeRowProps } from '@/shared/ui/tree';
import { selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { buildResourceRows, describeFrame, KindIcon, selectUniqueResources, useResourceStore, type ResourceRow } from '@/entities/resource';
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

/** Position and keyboard handling that come from the whole row model, not the rendered window. */
type RowNav = Pick<TreeRowProps, 'aria-posinset' | 'aria-setsize' | 'onKeyDown'>;

function FileRow({ row, selected, query, ...nav }: { row: Extract<ResourceRow, { type: 'file' }>; selected: boolean; query: string } & RowNav) {
  const { entry } = row;
  const frameLabel = describeFrame(entry);
  return (
    <ContextMenu items={fileMenu(entry)} label={`${fileName(entry.url)} actions`}>
      <TreeRow
        {...nav}
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
  const entries = useResourceStore(selectUniqueResources);
  const query = useResourceFilter((s) => s.query.trim());
  const activeUrl = useTabStore((s) => {
    const tab = selectActiveTab(s);
    return tab ? tab.url : null;
  });
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const rows = useMemo(() => buildResourceRows(entries, query, collapsed), [entries, query, collapsed]);
  const positions = useMemo(() => treePositions(rows), [rows]);

  const scroller = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => scroller.current, estimateSize: () => ROW_HEIGHT, overscan: 12 });

  // Keyboard focus moves over the row model; the target row may only render after the virtualizer scrolls to it.
  const focusTarget = useRef<{ key: string; index: number } | null>(null);
  const focusPending = () => {
    const target = focusTarget.current;
    const root = scroller.current;
    if (!target || !root) return;
    const index = rows.findIndex((r) => r.key === target.key);
    const focused = document.activeElement;
    // Give up when the row went away or focus moved on (a row scrolled out leaves focus on <body>).
    if (index === -1 || (focused && focused !== document.body && !root.contains(focused))) {
      focusTarget.current = null;
      return;
    }
    const element = root.querySelector<HTMLElement>(`[data-index="${index}"] [role="treeitem"]`);
    if (!element) {
      // Rows added above it since the scroll can push it out of the rendered window: follow it.
      if (index !== target.index) {
        target.index = index;
        virtual.scrollToIndex(index);
      }
      return;
    }
    focusTarget.current = null;
    element.focus({ preventScroll: true });
  };
  useEffect(focusPending);

  const onRowKeyDown = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    const pageSize = Math.max(1, Math.floor((scroller.current?.clientHeight ?? 0) / ROW_HEIGHT) - 1);
    const target = treeKeyTarget(rows, index, event.key, pageSize);
    if (target === null) return;
    event.preventDefault();
    focusTarget.current = { key: rows[target].key, index: target };
    virtual.scrollToIndex(target);
    focusPending();
  };

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
          const nav: RowNav = {
            'aria-posinset': positions[item.index].posInSet,
            'aria-setsize': positions[item.index].setSize,
            onKeyDown: onRowKeyDown(item.index),
          };
          return (
            <div
              key={row.key}
              data-index={item.index}
              className="absolute inset-x-1.5"
              style={{ top: 0, transform: `translateY(${item.start}px)`, height: ROW_HEIGHT }}
            >
              {row.type === 'file' ? (
                <FileRow {...nav} row={row} selected={row.entry.url === activeUrl} query={query} />
              ) : (
                <TreeRow
                  {...nav}
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
