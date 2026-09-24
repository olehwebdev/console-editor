import { countFiles } from './countFiles';
import { matches } from './matches';
import type { FileNode, FlatRow } from './types';

export function flatten(nodes: FileNode[], expanded: ReadonlySet<string>, query: string, depth = 0): FlatRow[] {
  return nodes.flatMap((node) => {
    if (query && !matches(node, query)) return [];
    if (!node.children) return [{ node, depth, count: 1 }];
    const open = query ? true : expanded.has(node.id);
    const row: FlatRow = { node, depth, expanded: open, count: countFiles(node) };
    return open ? [row, ...flatten(node.children, expanded, query, depth + 1)] : [row];
  });
}
