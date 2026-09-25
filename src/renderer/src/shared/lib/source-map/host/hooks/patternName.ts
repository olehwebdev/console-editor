import type { AnyNode } from './types';

/** Where each kind of variable pattern keeps the name that stands for it: the whole, the first item, the first property's value. */
const NAMED_BY: Partial<Record<string, (id: AnyNode) => AnyNode | null | undefined>> = {
  Identifier: (id) => id,
  ArrayPattern: (id) => (id.elements as Array<AnyNode | null>).find(Boolean),
  ObjectPattern: (id) => (id.properties as AnyNode[])[0]?.value as AnyNode | undefined,
};

/** The variable a hook's value goes to: `total`, `[qty, setQty]` → `qty`, `{ user }` → `user`. */
export function patternName(id: AnyNode): string | null {
  const named = NAMED_BY[id.type]?.(id);
  return named?.type === 'Identifier' ? (named.name as string) : null;
}
