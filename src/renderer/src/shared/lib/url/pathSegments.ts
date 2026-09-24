/** Path segments (directories + file) without the query, for trees and breadcrumbs. */
export function pathSegments(url: string): string[] {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    return segments.length ? segments : ['(index)'];
  } catch {
    return [url];
  }
}
