import type { ComponentNode, ComponentTreeLevel } from '@common/types';
import { pathKey } from './pathKey';

/** A row the Components tree shows: a component, or how many more a level has than it lists. */
export type TreeRow = { kind: 'node'; key: string; path: number[]; depth: number; node: ComponentNode } | { kind: 'more'; key: string; depth: number; more: number };

/** The rows of the tree as far as it is open: each level read under its expanded node, depth first. */
export function treeRows(levels: Readonly<Record<string, ComponentTreeLevel | null>>, expanded: Readonly<Record<string, boolean>>): TreeRow[] {
  const rows: TreeRow[] = [];
  const add = (path: number[]) => {
    const level = levels[pathKey(path)];
    if (!level) return;
    level.nodes.forEach((node, index) => {
      const at = [...path, index];
      rows.push({ kind: 'node', key: pathKey(at), path: at, depth: path.length, node });
      if (expanded[pathKey(at)]) add(at);
    });
    if (level.more) rows.push({ kind: 'more', key: `${pathKey(path)}+`, depth: path.length, more: level.more });
  };
  add([]);
  return rows;
}
