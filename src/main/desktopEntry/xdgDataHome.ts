import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { XDG } from './constants';

/** The user's XDG data folder: XDG_DATA_HOME when it is an absolute path (the spec ignores any other), else ~/.local/share. */
export function xdgDataHome(): string {
  const set = process.env[XDG.dataHomeEnv];
  return set && isAbsolute(set) ? set : join(homedir(), XDG.defaultDataHome);
}
