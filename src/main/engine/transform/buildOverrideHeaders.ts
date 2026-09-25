import type { ResourceKind } from '../../../shared/types';
import { CONTENT_TYPE } from '../constants';
import { BODY_HEADERS, CONTENT_TYPE_HEADER, SOURCE_MAP_HEADERS } from './constants';
import { defaultContentType } from './defaultContentType';
import { findHeader } from './findHeader';
import type { HeaderEntry } from './types';
import { withUtf8Charset } from './withUtf8Charset';

/** Upstream caching headers: replaced by `Cache-Control: no-store`. */
const CACHING_HEADERS = ['cache-control', 'expires', 'pragma'];
const CACHE_CONTROL_HEADER = 'Cache-Control';
const NO_STORE = 'no-store';

/**
 * Headers for a response whose body was replaced by an override.
 * Keeps upstream headers (CORS, cookies, CSP, ...) so the page behaves the same,
 * but drops the ones tied to the old body, forces UTF-8 and disables caching.
 */
export function buildOverrideHeaders(
  upstream: HeaderEntry[] | undefined,
  kind: ResourceKind,
  opts: { stripSourceMaps: boolean },
): HeaderEntry[] {
  const drop = new Set([...BODY_HEADERS, CONTENT_TYPE, ...CACHING_HEADERS]);
  if (opts.stripSourceMaps) {
    for (const name of SOURCE_MAP_HEADERS) drop.add(name);
  }
  const headers = (upstream ?? []).filter((h) => !drop.has(h.name.toLowerCase()));
  const contentType = findHeader(upstream, CONTENT_TYPE) || defaultContentType(kind);
  headers.push({ name: CONTENT_TYPE_HEADER, value: withUtf8Charset(contentType) });
  headers.push({ name: CACHE_CONTROL_HEADER, value: NO_STORE });
  return headers;
}
