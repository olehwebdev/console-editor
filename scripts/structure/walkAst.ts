import { VISITOR_KEYS, type Node } from '@babel/types';

/** Calls `visit` on `node` and every node under it, parents first. */
export function walkAst(node: Node, visit: (node: Node, parent: Node | null) => void, parent: Node | null = null): void {
  visit(node, parent);
  for (const key of VISITOR_KEYS[node.type] ?? []) {
    const child = (node as unknown as Record<string, Node | Node[] | null | undefined>)[key];
    for (const item of Array.isArray(child) ? child : [child]) {
      if (item && typeof item.type === 'string') walkAst(item, visit, node);
    }
  }
}
