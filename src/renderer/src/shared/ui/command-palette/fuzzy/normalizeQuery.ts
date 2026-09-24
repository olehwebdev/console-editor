import { lowerSameLength } from './lowerSameLength';

/** Normalizes a raw query: lower-case, whitespace removed. */
export function normalizeQuery(query: string): string {
  return lowerSameLength(query).replace(/\s+/g, '');
}
