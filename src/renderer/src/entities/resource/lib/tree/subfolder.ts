import type { Folder } from './types';

export function subfolder(folders: Map<string, Folder>, name: string): Folder {
  let folder = folders.get(name);
  if (!folder) {
    folder = { name, folders: new Map(), files: [], count: 0 };
    folders.set(name, folder);
  }
  return folder;
}
