import { cleanLabel } from '../cleanLabel';

/** Whether the Explorer filter matches an original, by its URL as shown. */
export function matchesSource(url: string, query: string): boolean {
  return cleanLabel(url).toLowerCase().includes(query.toLowerCase());
}
