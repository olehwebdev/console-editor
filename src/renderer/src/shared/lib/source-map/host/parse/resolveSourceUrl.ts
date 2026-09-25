/** A URL with a scheme, which a sourceRoot doesn't prefix. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;
const SLASH = '/';

/**
 * A map's source as a URL, the way DevTools reads it (not the spec's literal text): an empty
 * sourceRoot is none, it prefixes only relative sources, and the result is resolved against the map's
 * URL (the bundle's for an inline map). A source that won't parse (`turbopack://[project]/…`) stays as
 * written.
 */
export function resolveSourceUrl(source: string, sourceRoot: string | undefined, baseUrl: string): string {
  const joined = sourceRoot && !ABSOLUTE_URL.test(source) ? `${sourceRoot}${sourceRoot.endsWith(SLASH) ? '' : SLASH}${source}` : source;
  try {
    return new URL(joined, baseUrl).href;
  } catch {
    return source;
  }
}
