import type { OriginalSource } from '@/shared/lib';
import { parseSourceUrl } from './parseSourceUrl';
import { sourceFolder } from './sourceFolder';
import type { SourceHierarchy } from './types';

/** Built once per list of sources: a map's list stays the same object while it is loaded. */
const built = new WeakMap<readonly OriginalSource[], SourceHierarchy>();

/** Groups originals by root and folder, library code apart. */
export function sourceHierarchy(sources: readonly OriginalSource[]): SourceHierarchy {
  const cached = built.get(sources);
  if (cached) return cached;
  const hierarchy: SourceHierarchy = { authored: new Map(), libraries: new Map(), libraryCount: 0 };
  for (const source of sources) {
    const { root, dirs, file } = parseSourceUrl(source.url);
    if (source.library) hierarchy.libraryCount++;
    let folder = sourceFolder(source.library ? hierarchy.libraries : hierarchy.authored, root);
    folder.count++;
    for (const dir of dirs) {
      folder = sourceFolder(folder.folders, dir);
      folder.count++;
    }
    folder.files.push({ source, label: file });
  }
  built.set(sources, hierarchy);
  return hierarchy;
}
