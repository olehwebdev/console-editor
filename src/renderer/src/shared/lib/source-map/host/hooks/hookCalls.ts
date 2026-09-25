import { calleeName } from './calleeName';
import { childNodes } from './childNodes';
import { CUSTOM_HOOK, FUNCTION_TYPES, HOOK_ENTRIES, TRANSPARENT } from './constants';
import { patternName } from './patternName';
import type { AnyNode, HookCall } from './types';

/** The hooks a function's body calls, in order, each with the variable it sets; functions inside it are left out. */
export function hookCalls(fn: AnyNode): HookCall[] {
  const calls: HookCall[] = [];
  const visit = (node: AnyNode, name: string | null): void => {
    if (FUNCTION_TYPES.has(node.type)) return;
    if (node.type === 'VariableDeclarator') {
      if (node.init) visit(node.init as AnyNode, patternName(node.id as AnyNode));
      return;
    }
    if (TRANSPARENT.has(node.type)) return visit(node.expression as AnyNode, name);
    const hook = node.type === 'CallExpression' ? calleeName(node.callee as AnyNode) : null;
    if (hook && (HOOK_ENTRIES.has(hook) || CUSTOM_HOOK.test(hook))) calls.push({ hook, name, start: node.start ?? 0 });
    for (const child of childNodes(node)) visit(child, null);
  };
  visit(fn.body as AnyNode, null);
  return calls.sort((a, b) => a.start - b.start);
}
