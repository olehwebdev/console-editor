import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { JsonNode } from '@common/json';
import { flattenJson } from '@/shared/lib';
import { TREE_OVERSCAN, TREE_ROW_HEIGHT, useResponseViews } from '../../model';
import { treeActions } from './treeActions';
import { TREE_KEYS } from './treeKeys';
import { TreeRowView } from './TreeRowView';
import type { EditPart } from './types';

/** A tab never opened as a tree has its root open. */
const ROOT_OPEN: readonly string[] = [''];

export interface TreeListProps {
  tabId: string;
  root: JsonNode;
  /** The text `root` was read from. */
  text: string;
}

/** The response's values as a tree: virtualized, one row each, what is open kept per tab; arrows move, Enter edits. */
export function TreeList({ tabId, root, text }: TreeListProps) {
  const open = useResponseViews((s) => s.open[tabId] ?? ROOT_OPEN);
  const openIds = useMemo(() => new Set(open), [open]);
  const rows = useMemo(() => flattenJson(root, openIds), [root, openIds]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; part: EditPart } | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  // The tree takes focus as it appears (turned on, or its tab shown), as the text editor would.
  const attach = useCallback((el: HTMLDivElement | null) => {
    scroller.current = el;
    el?.focus({ preventScroll: true });
  }, []);
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => TREE_ROW_HEIGHT,
    overscan: TREE_OVERSCAN,
    getItemKey: (index) => rows[index]!.id,
  });
  const actions = treeActions({ tabId, text, open, setSelected, setEditing });
  const at = rows.findIndex((r) => r.id === selected);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const handle = Object.hasOwn(TREE_KEYS, event.key) ? TREE_KEYS[event.key] : undefined;
    if (!handle || !rows.length) return;
    event.preventDefault();
    const move = (index: number) => {
      const next = Math.min(rows.length - 1, Math.max(0, index));
      setSelected(rows[next]!.id);
      virtual.scrollToIndex(next);
    };
    handle({ rows, at, move, actions });
  };

  return (
    <div
      ref={attach}
      role="tree"
      tabIndex={0}
      aria-label="Response as a tree"
      aria-activedescendant={at >= 0 ? `tree-row-${at}` : undefined}
      data-testid="response-tree"
      onKeyDown={onKeyDown}
      className="min-h-0 flex-1 overflow-auto py-1 pl-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
    >
      <div className="relative w-full" style={{ height: virtual.getTotalSize() }}>
        {virtual.getVirtualItems().map((item) => {
          const row = rows[item.index]!;
          return (
            <div key={item.key} className="absolute inset-x-0 top-0" style={{ transform: `translateY(${item.start}px)` }}>
              <TreeRowView row={row} text={text} index={item.index} selected={row.id === selected} editing={editing?.id === row.id ? editing.part : null} actions={actions} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
