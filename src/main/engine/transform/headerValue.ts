import { findHeader } from './findHeader';
import type { HeaderEntry } from './types';

export function headerValue(headers: HeaderEntry[] | undefined, name: string): string | undefined {
  return findHeader(headers, name.toLowerCase());
}
