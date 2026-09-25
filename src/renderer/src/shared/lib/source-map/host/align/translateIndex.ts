import { EDITED } from './constants';

/**
 * The index of the same code character in the other text: identical before the common prefix's end,
 * shifted by the length difference within the common suffix, and EDITED in between.
 */
export function translateIndex(index: number, fromLength: number, toLength: number, prefix: number, suffix: number): number {
  if (index < prefix) return index;
  if (index >= fromLength - suffix) return index + (toLength - fromLength);
  return EDITED;
}
