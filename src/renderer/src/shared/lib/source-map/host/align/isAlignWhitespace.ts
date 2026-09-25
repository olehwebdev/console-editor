import { WHITESPACE_CODES } from '../../constants';

const SPACE = 0x20;
const TAB = 0x09;
const CARRIAGE_RETURN = 0x0d;
const ASCII_END = 0x80;

/** Whether lining up skips this UTF-16 code unit (see WHITESPACE_CODES). */
export function isAlignWhitespace(code: number): boolean {
  if (code <= SPACE) return code === SPACE || (code >= TAB && code <= CARRIAGE_RETURN);
  return code >= ASCII_END && WHITESPACE_CODES.has(code);
}
