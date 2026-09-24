import { decodeSegment } from './decodeSegment';
import type { ParsedUrl } from './types';

export function parseUrl(url: string): ParsedUrl {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').map(decodeSegment);
    const file = (parts.pop() || '(index)') + u.search;
    return { origin: u.origin || url, dirs: parts.filter(Boolean), file };
  } catch {
    return { origin: url, dirs: [], file: url };
  }
}
