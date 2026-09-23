import type { ResourceKind } from '../../shared/types';

export interface HeaderEntry {
  name: string;
  value: string;
}

const TAG_WITH_INTEGRITY = /<(?:script|link)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const INTEGRITY_ATTR = /\s+integrity\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+)/i;

/**
 * Removes Subresource Integrity attributes from `<script>` and `<link>` tags.
 * Without this, the browser rejects any edited script/stylesheet that the page
 * references with `integrity="sha384-..."`.
 */
export function stripIntegrityAttributes(html: string): { html: string; count: number } {
  let count = 0;
  const out = html.replace(TAG_WITH_INTEGRITY, (tag) => {
    if (!INTEGRITY_ATTR.test(tag)) return tag;
    count++;
    return tag.replace(INTEGRITY_ATTR, '');
  });
  return { html: out, count };
}

/**
 * Injected before any page script when SRI stripping is on. Loaders such as
 * webpack-subresource-integrity set `integrity` from JavaScript on lazily
 * created `<script>`/`<link>` tags, which HTML rewriting can't see.
 */
export const SRI_GUARD_SOURCE = `(() => {
  const isGuarded = (el) => el instanceof HTMLScriptElement || el instanceof HTMLLinkElement;
  for (const proto of [HTMLScriptElement.prototype, HTMLLinkElement.prototype]) {
    const desc = Object.getOwnPropertyDescriptor(proto, 'integrity');
    if (desc && desc.configurable) {
      Object.defineProperty(proto, 'integrity', { configurable: true, enumerable: desc.enumerable, get() { return ''; }, set() {} });
    }
  }
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (typeof name === 'string' && name.toLowerCase() === 'integrity' && isGuarded(this)) return;
    return setAttribute.call(this, name, value);
  };
})();`;

/**
 * Removes `sourceMappingURL` comments. Once a file is edited (or pretty-printed)
 * its source map no longer lines up, and DevTools would show misleading code.
 */
export function stripSourceMapComments(code: string): string {
  return code
    .replace(/^[ \t]*\/\/[#@][ \t]*sourceMappingURL=[^\r\n]*$/gm, '')
    .replace(/\/\*[#@][ \t]*sourceMappingURL=[\s\S]*?\*\//g, '');
}

export function defaultContentType(kind: ResourceKind): string {
  switch (kind) {
    case 'Script':
      return 'text/javascript';
    case 'Stylesheet':
      return 'text/css';
    case 'Document':
      return 'text/html';
  }
}

function withUtf8Charset(contentType: string): string {
  return `${contentType.split(';')[0].trim()}; charset=utf-8`;
}

function findHeader(headers: HeaderEntry[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name)?.value;
}

/** Headers that describe the upstream body and become wrong once we replace it. */
const BODY_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'content-md5',
  'digest',
  'content-digest',
  'repr-digest',
  'etag',
  'last-modified',
]);

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
  const drop = new Set([...BODY_HEADERS, 'content-type', 'cache-control', 'expires', 'pragma']);
  if (opts.stripSourceMaps) {
    drop.add('sourcemap');
    drop.add('x-sourcemap');
  }
  const headers = (upstream ?? []).filter((h) => !drop.has(h.name.toLowerCase()));
  const contentType = findHeader(upstream, 'content-type') || defaultContentType(kind);
  headers.push({ name: 'Content-Type', value: withUtf8Charset(contentType) });
  headers.push({ name: 'Cache-Control', value: 'no-store' });
  return headers;
}

/** Headers for an upstream response whose (text) body we rewrote, e.g. to strip SRI. */
export function buildRewrittenHeaders(upstream: HeaderEntry[] | undefined, fallbackType: string): HeaderEntry[] {
  const headers = (upstream ?? []).filter((h) => !BODY_HEADERS.has(h.name.toLowerCase()) && h.name.toLowerCase() !== 'content-type');
  headers.push({ name: 'Content-Type', value: withUtf8Charset(findHeader(upstream, 'content-type') || fallbackType) });
  return headers;
}

export function charsetOf(contentType: string | undefined): string {
  const m = contentType && /charset\s*=\s*"?([^";\s]+)/i.exec(contentType);
  return m ? m[1].toLowerCase() : 'utf-8';
}

/** Decodes a CDP body (`base64Encoded` or plain text) into a string. */
export function decodeBody(body: string, base64Encoded: boolean, contentType?: string): string {
  if (!base64Encoded) return body;
  const bytes = Buffer.from(body, 'base64');
  try {
    return new TextDecoder(charsetOf(contentType)).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

export function headerValue(headers: HeaderEntry[] | undefined, name: string): string | undefined {
  return findHeader(headers, name.toLowerCase());
}

export function isRedirect(status: number | undefined, headers: HeaderEntry[] | undefined): boolean {
  return status !== undefined && status >= 300 && status < 400 && !!findHeader(headers, 'location');
}
