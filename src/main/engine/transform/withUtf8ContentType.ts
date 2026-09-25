import { CONTENT_TYPE } from '../constants';
import type { HeaderEntry } from './types';
import { withUtf8Charset } from './withUtf8Charset';

/** The headers with every Content-Type saying UTF-8: for bodies we re-encoded as UTF-8. */
export function withUtf8ContentType(headers: HeaderEntry[]): HeaderEntry[] {
  return headers.map((h) => (h.name.toLowerCase() === CONTENT_TYPE ? { name: h.name, value: withUtf8Charset(h.value) } : h));
}
