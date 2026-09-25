import type { File } from '@babel/types';
import { HOOK_ENTRIES, MAX_HOOK_DEPTH } from './constants';
import { hookCalls } from './hookCalls';
import { hookDefinition } from './hookDefinition';
import type { AnyNode, HookLayout } from './types';

/**
 * A function's hook entries as React lists them, each named by the variable its hook sets (else the hook's
 * name). A custom hook defined in the same file is read in place; one from elsewhere stops the reading,
 * since how many entries it adds is unknown.
 */
export function hookLayout(fn: AnyNode, file: File, depth = 0): HookLayout {
  const names: Array<string | null> = [];
  for (const call of hookCalls(fn)) {
    const entries = HOOK_ENTRIES.get(call.hook);
    if (entries !== undefined) {
      names.push(...Array.from({ length: entries }, () => call.name ?? call.hook));
      continue;
    }
    const definition = depth < MAX_HOOK_DEPTH ? hookDefinition(file, call.hook) : null;
    if (!definition) return { names, complete: false };
    const inner = hookLayout(definition, file, depth + 1);
    names.push(...inner.names);
    if (!inner.complete) return { names, complete: false };
  }
  return { names, complete: true };
}
