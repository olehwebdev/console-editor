/** Path plus query, e.g. `/static/js/main.js?v=2`. */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}
