import type { AnyNode } from './types';

/** The name a call calls: `useState(`, `React.useState(`; null for anything else. */
export function calleeName(callee: AnyNode): string | null {
  if (callee.type === 'Identifier') return callee.name as string;
  const property = callee.property as AnyNode | undefined;
  return callee.type === 'MemberExpression' && !callee.computed && property?.type === 'Identifier' ? (property.name as string) : null;
}
