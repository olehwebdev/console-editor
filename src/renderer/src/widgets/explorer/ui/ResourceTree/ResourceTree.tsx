import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { icons } from '@/shared/config';
import { EmptyState } from '@/shared/ui/empty-state';
import { HoverHighlight } from '@/shared/ui/hover-highlight';
import { treeKeyTarget, treePositions } from '@/shared/ui/tree';
import { selectActiveSource, selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { buildResourceRows, selectUniqueResources, useResourceStore } from '@/entities/resource';
import { sourceKey, useSourceMapStore, type IsOpen } from '@/entities/source-map';
import { useResourceFilter } from '@/features/filter-resources';
import { useSourceTree } from '@/features/open-resource';
import { bundlesMatching, withSourceRows } from '../../lib';
import { ExplorerRowView } from './ExplorerRowView';
import type { RowContext, RowNav } from './types';

/** Every row's height: the virtualizer's estimate, a page for PageUp/PageDown, and each row's box. */
const ROW_HEIGHT = 26;

/** Rows rendered beyond each edge of the visible window, so a fast scroll doesn't show gaps. */
const OVERSCAN_ROWS = 12;

const { clearReveal } = useSourceTree.getState();

/**
 * Files the page loaded, as origin → folder → file, with the originals of
 * scripts and stylesheets nested under them. Virtualized: pages with thousands
 * of chunks, and maps with thousands of files, stay smooth. Components
 * subscribe to narrow slices only.
 */
export function ResourceTree() {
  const entries = useResourceStore(selectUniqueResources);
  const query = useResourceFilter((s) => s.query.trim());
  const activeUrl = useTabStore((s) => {
    const tab = selectActiveTab(s);
    return tab ? tab.url : null;
  });
  const activeSourceKey = useTabStore((s) => {
    const source = selectActiveSource(s);
    return source ? sourceKey(source.bundleUrl, source.url) : null;
  });
  const byBundle = useSourceMapStore((s) => s.byBundle);
  const toggled = useSourceTree((s) => s.toggled);
  const reveal = useSourceTree((s) => s.reveal);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const matching = useMemo(() => bundlesMatching(byBundle, query), [byBundle, query]);
  const rows = useMemo(() => {
    const isOpen: IsOpen = (key, byDefault) => byDefault !== toggled.has(key);
    return withSourceRows(buildResourceRows(entries, query, collapsed, matching), { byBundle, isOpen, query, matching });
  }, [entries, query, collapsed, matching, byBundle, toggled]);
  const positions = useMemo(() => treePositions(rows), [rows]);

  const scroller = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => scroller.current, estimateSize: () => ROW_HEIGHT, overscan: OVERSCAN_ROWS });

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

  // Scrolls to a bundle row another view asked to show (a header, the palette), then marks the ask done.
  useEffect(() => {
    if (!reveal) return;
    const index = rows.findIndex((row) => row.type === 'file' && row.entry.url === reveal.bundleUrl);
    if (index !== -1) virtual.scrollToIndex(index, { align: 'center' });
    clearReveal(reveal.token);
  }, [reveal, rows, virtual]);

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

  const context: RowContext = { query, activeUrl, activeSourceKey, toggleFolder: toggle };

  if (!entries.length) {
    return (
      <EmptyState icon={icons.ExplorerIcon} title="No files yet" className="py-8">
        Scripts, stylesheets and HTML the page loads show up here, including the ones inside iframes and workers.
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
              <ExplorerRowView row={row} context={context} nav={nav} />
            </div>
          );
        })}
      </HoverHighlight>
    </div>
  );
}
