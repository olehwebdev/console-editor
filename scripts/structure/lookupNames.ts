import { extname } from 'node:path';
import { MODULE_EXTENSIONS } from './constants.ts';
import type { FolderEntry } from './types.ts';

/**
 * The names a lookup can reach `entry` by: its own, and for a module file the one an import without the extension
 * uses (`Foo.tsx` is also `Foo`). A folder is a module by its own name, through its index.
 */
export function lookupNames({ name, directory }: FolderEntry): string[] {
  const extension = extname(name);
  if (directory || !MODULE_EXTENSIONS.includes(extension)) return [name];
  return [name, name.slice(0, -extension.length)];
}
