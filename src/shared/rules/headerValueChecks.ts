import { HEADER_VALUE_BREAK, MAX_HEADER_VALUE_CHARS } from './constants';
import type { HeaderValueChecks } from './types';

/** What each header operation accepts as a value. */
export const HEADER_VALUE_CHECKS: HeaderValueChecks = {
  set: (value) => {
    if (HEADER_VALUE_BREAK.test(value)) return "Header values can't contain line breaks";
    if (value.length > MAX_HEADER_VALUE_CHARS) return `Header values are at most ${MAX_HEADER_VALUE_CHARS} characters`;
    return null;
  },
  remove: (value) => (value === '' ? null : 'A removed header takes no value'),
};
