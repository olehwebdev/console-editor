import { isAbsolute } from 'node:path';
import { XDG } from './constants';

/** The system's XDG data folders, where packages install: XDG_DATA_DIRS's absolute paths (the spec ignores others), else its default. */
export function xdgDataDirs(): string[] {
  const set = process.env[XDG.dataDirsEnv]?.split(':').filter((dir) => isAbsolute(dir));
  return set?.length ? set : [...XDG.defaultDataDirs];
}
