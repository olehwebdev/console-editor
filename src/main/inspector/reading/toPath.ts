import { MAX_TREE_DEPTH } from '../constants';

/** A path into the Components tree as the renderer sent it: indexes, none negative; null if it isn't one. */
export function toPath(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_TREE_DEPTH) return null;
  return raw.every((index) => typeof index === 'number' && Number.isInteger(index) && index >= 0) ? (raw as number[]) : null;
}
