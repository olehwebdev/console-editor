import { cleanLabel } from '../cleanLabel';
import { decodePart } from './decodePart';
import type { SourcePath } from './types';

/** http(s) sources group by origin; every other scheme by its scheme and host. */
const WEB_PROTOCOL = /^https?:$/;
/** `scheme://host/rest`, for sources a URL parser refuses (`turbopack://[project]/…`). */
const SCHEME_AND_HOST = /^([a-z][a-z0-9+.-]*:)\/\/([^/?#]*)(.*)$/i;
const SLASH = '/';
const INDEX = '(index)';

/**
 * Where an original goes in the tree. Non-web schemes (webpack:, file:) have no origin to group by
 * (their `origin` is "null"), so they group by `scheme://host`. The file keeps its query, so a
 * component's blocks (`App.vue?vue&type=script`) stay apart. Names are cleaned for display.
 */
export function parseSourceUrl(url: string): SourcePath {
  let root: string;
  let path: string;
  let query = '';
  try {
    const parsed = new URL(url);
    root = WEB_PROTOCOL.test(parsed.protocol) ? parsed.origin : `${parsed.protocol}//${parsed.host}`;
    path = parsed.pathname;
    query = parsed.search;
  } catch {
    const match = SCHEME_AND_HOST.exec(url);
    root = match ? `${match[1]}//${match[2]}` : '';
    path = match ? match[3]! : url;
  }
  const parts = path.split(SLASH).filter(Boolean).map((part) => cleanLabel(decodePart(part)));
  const file = (parts.pop() ?? INDEX) + cleanLabel(query);
  return { root: cleanLabel(root), dirs: parts, file };
}
