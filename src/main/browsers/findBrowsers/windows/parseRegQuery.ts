import { REG_VALUE_LINE } from './constants';
import type { RegKey } from './types';

/** `reg query /s` output as its keys, by path in lower case (the registry ignores case), value names in lower case too. */
export function parseRegQuery(output: string): Map<string, RegKey> {
  const keys = new Map<string, RegKey>();
  let current: RegKey | undefined;
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const value = REG_VALUE_LINE.exec(line);
    if (value && current) {
      current.values.set(value[1].toLowerCase(), value[3] ?? '');
    } else if (!line.startsWith(' ')) {
      current = { path: line.trim(), values: new Map() };
      keys.set(current.path.toLowerCase(), current);
    }
  }
  return keys;
}
