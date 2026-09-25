import type { ConsoleFrame } from '@common/types';
import { frameKey } from './frameKey';

/**
 * The frame with key `key`, else the iframe whose `name` attribute is `name`
 * (its address changed, as when a service moves to a new path); of several,
 * one that can run code. Null when the page has none.
 */
export function findFrame(frames: readonly ConsoleFrame[], key: string, name: string): ConsoleFrame | null {
  let found = frames.filter((f) => frameKey(f) === key);
  if (!found.length && name) found = frames.filter((f) => f.parentId && f.name === name);
  return found.find((f) => f.canRun) ?? found[0] ?? null;
}
