import type { File } from '@babel/types';
import { childNodes } from './childNodes';
import { FUNCTION_TYPES } from './constants';
import type { AnyNode } from './types';

/** The innermost function whose code holds an offset: where V8 says a function starts, that function. */
export function functionAt(file: File, offset: number): AnyNode | null {
  let found: AnyNode | null = null;
  const stack: AnyNode[] = [file as AnyNode];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.start == null || node.end == null || offset < node.start || offset >= node.end) continue;
    if (FUNCTION_TYPES.has(node.type)) found = node;
    stack.push(...childNodes(node));
  }
  return found;
}
