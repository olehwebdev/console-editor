import { LONG_TEXT_FACTOR, LONG_TEXT_FILLER, LONG_TEXT_MIN_LENGTH } from './constants';

/** A text made much longer (words added after it), for testing how a layout copes. */
export function lengthened(value: string): string {
  const target = Math.max(LONG_TEXT_MIN_LENGTH, value.length * LONG_TEXT_FACTOR);
  let out = value ? `${value} ` : '';
  while (out.length < target) out += LONG_TEXT_FILLER;
  return out.slice(0, target).trimEnd();
}
