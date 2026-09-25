import { BYTES_PER_MB, DATA_URL, MAX_SHOWN_REFERENCE, REMOTE_MAP_PROTOCOLS } from './constants';
import type { ResolvedMapUrl, SourceMapLimits } from './types';

/**
 * Where a map reference points, relative to the bundle's final URL. A data: map is handed on as it is
 * (checked before parsing, so a multi-MB one is never parsed here); anything but http(s) is refused
 * before any request, so a page can't make the app read local files or custom protocols.
 */
export function resolveMapUrl(value: string, bundleUrl: string, limits: SourceMapLimits): ResolvedMapUrl {
  if (DATA_URL.test(value)) {
    return value.length <= limits.maxInlineChars
      ? { type: 'inline', dataUrl: value }
      : { type: 'failed', failure: 'too-large', detail: String(Math.round(limits.maxInlineChars / BYTES_PER_MB)) };
  }
  let url: URL;
  try {
    url = new URL(value, bundleUrl);
  } catch {
    return { type: 'failed', failure: 'bad-url', detail: value.slice(0, MAX_SHOWN_REFERENCE) };
  }
  if (!REMOTE_MAP_PROTOCOLS.has(url.protocol)) return { type: 'failed', failure: 'scheme', detail: url.protocol };
  return { type: 'remote', url: url.href };
}
