import type { Node } from '@babel/types';
import { EQUALITY_OPERATORS } from './constants.ts';

/** Literal nodes: what a switch-like comparison compares a value with. */
const LITERAL_TYPES: ReadonlySet<string> = new Set(['StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral', 'BigIntLiteral']);

/** In `x === 'a'` (either way round), the source text of `x`; null for any other condition. */
export function comparedSubject(condition: Node, source: string): string | null {
  if (condition.type !== 'BinaryExpression' || !EQUALITY_OPERATORS.includes(condition.operator)) return null;
  const { left, right } = condition;
  const other = LITERAL_TYPES.has(right.type) ? left : LITERAL_TYPES.has(left.type) ? right : null;
  return other && other.start != null && other.end != null ? source.slice(other.start, other.end) : null;
}
