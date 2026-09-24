import type { FileNode } from './types';

export function matches(node: FileNode, query: string): boolean {
  if (!node.children) return node.name.toLowerCase().includes(query);
  return node.children.some((child) => matches(child, query));
}
