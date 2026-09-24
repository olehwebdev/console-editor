import { CONTENT_TYPE } from '../constants';
import { BODY_HEADERS, CONTENT_TYPE_HEADER } from './constants';
import { findHeader } from './findHeader';
import type { HeaderEntry } from './types';
import { withUtf8Charset } from './withUtf8Charset';

/** Headers for an upstream response whose (text) body we rewrote, e.g. to strip SRI. */
export function buildRewrittenHeaders(upstream: HeaderEntry[] | undefined, fallbackType: string): HeaderEntry[] {
  const headers = (upstream ?? []).filter((h) => !BODY_HEADERS.has(h.name.toLowerCase()) && h.name.toLowerCase() !== CONTENT_TYPE);
  headers.push({ name: CONTENT_TYPE_HEADER, value: withUtf8Charset(findHeader(upstream, CONTENT_TYPE) || fallbackType) });
  return headers;
}
