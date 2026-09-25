import { SOURCE_MAP_HEADERS } from './constants';
import { findHeader } from './findHeader';
import type { HeaderEntry } from './types';

/**
 * The source map a response names in its headers, as written: `SourceMap`, else `X-SourceMap`. A
 * header sent twice arrives joined by newlines; the first one counts.
 */
export function sourceMapHeader(headers: HeaderEntry[] | undefined): string | undefined {
  for (const name of SOURCE_MAP_HEADERS) {
    const value = findHeader(headers, name)?.split('\n')[0]?.trim();
    if (value) return value;
  }
  return undefined;
}
