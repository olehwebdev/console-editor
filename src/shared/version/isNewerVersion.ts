import { compareVersions } from './compareVersions';
import { parseVersion } from './parseVersion';

/** Whether `candidate` is a newer version than `current`. */
export function isNewerVersion(candidate: string, current: string): boolean {
  return parseVersion(candidate) !== null && compareVersions(candidate, current) > 0;
}
