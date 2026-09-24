import { GLOB_WILDCARD } from './constants';
import { escapeRegExp } from './escapeRegExp';

/** `*` matches any run of characters; everything else is literal. */
export function globToRegExp(glob: string): RegExp {
  return new RegExp(`^${glob.split(GLOB_WILDCARD).map(escapeRegExp).join('.*')}$`);
}
