/** What a request's row shows as its name: its path and query, or the whole URL when that isn't a web address. */
export function requestPath(url: string): string {
  try {
    const { pathname, search, protocol } = new URL(url);
    return protocol.startsWith('http') ? `${pathname}${search}` : url;
  } catch {
    return url;
  }
}
