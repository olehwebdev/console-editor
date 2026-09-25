import type { SourceFolder } from './types';

/** The folder `name` in `folders`, made if new. */
export function sourceFolder(folders: Map<string, SourceFolder>, name: string): SourceFolder {
  let folder = folders.get(name);
  if (!folder) {
    folder = { name, folders: new Map(), files: [], count: 0 };
    folders.set(name, folder);
  }
  return folder;
}
