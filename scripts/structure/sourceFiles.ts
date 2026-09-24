import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { DECLARATION_SUFFIX, SOURCE_EXTENSIONS, SOURCE_ROOTS } from './constants.ts';

/** Every checked file under the source roots, as paths from `root`, sorted. */
export function sourceFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) && !entry.name.endsWith(DECLARATION_SUFFIX)) files.push(relative(root, path));
    }
  };
  for (const dir of SOURCE_ROOTS) visit(join(root, dir));
  return files.sort();
}
