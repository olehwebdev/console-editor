import { IDENTIFIER } from './constants';

/** A property access for `name`, as code: `.qty`, or `["my key"]`. */
export function member(name: string): string {
  return IDENTIFIER.test(name) ? `.${name}` : `[${JSON.stringify(name)}]`;
}
