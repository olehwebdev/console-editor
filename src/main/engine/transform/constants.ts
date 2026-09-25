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

/** Headers that describe the upstream body and become wrong once we replace it. */
export const BODY_HEADERS = new Set([
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

/** The Content-Type header as we write it. */
export const CONTENT_TYPE_HEADER = 'Content-Type';

/** The charset of every body we serve, and of bodies whose charset is unknown or unsupported. */
export const UTF8 = 'utf-8';

/**
 * Headers that describe how upstream framed and encoded its bytes. A body we
 * pass back is already decoded, so they go; ETag and Last-Modified stay, as
 * the bytes themselves don't change.
 */
export const ENCODING_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'content-md5',
  'digest',
  'content-digest',
  'repr-digest',
]);
