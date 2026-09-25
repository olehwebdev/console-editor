import type { Node } from '@babel/types';
import { COMPONENT_WRAPPERS } from './constants.ts';

/** Values that are functions (or classes) in all but syntax. */
const FUNCTION_TYPES: ReadonlySet<string> = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'ClassExpression']);
/** Expressions that only wrap another: `fn as T`, `fn satisfies T`, `(fn)`. */
const WRAPPER_TYPES: ReadonlySet<string> = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'ParenthesizedExpression']);

/** Whether a top-level value is a function: an arrow, a function or class expression, or a wrapped component (`memo(Row)`). */
export function isFunctionValue(node: Node | null | undefined): boolean {
  if (!node) return false;
  if (FUNCTION_TYPES.has(node.type)) return true;
  if (WRAPPER_TYPES.has(node.type) && 'expression' in node) return isFunctionValue(node.expression as Node);
  return node.type === 'CallExpression' && node.callee.type === 'Identifier' && COMPONENT_WRAPPERS.includes(node.callee.name);
}
