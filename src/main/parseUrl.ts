/** `url` parsed, or null if it isn't a valid absolute URL. */
export function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
