import type { HarPair } from './types';

/** A URL's query string as HAR lists it (none for a URL that can't be parsed). */
export function queryOf(url: string): HarPair[] {
  try {
    return [...new URL(url).searchParams].map(([name, value]) => ({ name, value }));
  } catch {
    return [];
  }
}
