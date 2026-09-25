import { HOOK_PLACE } from './constants';

/** What to call a component's state value: a React hook by the variable its original sets (else `#place`), anything else by its own name. */
export function hookName(name: string, names: ReadonlyArray<string | null> | undefined): string {
  if (!HOOK_PLACE.test(name)) return name;
  return names?.[Number(name) - 1] ?? `#${name}`;
}
