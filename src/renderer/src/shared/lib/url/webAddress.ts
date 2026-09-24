/** The protocols of pages on the web. */
const WEB_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/**
 * A web page's address without its query or hash (`https://cart.example.com/embed`);
 * '' for anything else (`about:blank`, `data:`, not a URL).
 */
export function webAddress(url: string): string {
  try {
    const { protocol, origin, pathname } = new URL(url);
    return WEB_PROTOCOLS.has(protocol) ? `${origin}${pathname}` : '';
  } catch {
    return '';
  }
}
