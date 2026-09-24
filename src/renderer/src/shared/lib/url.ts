/** Last path segment of a URL (decoded), `(index)` for `/`. */
export function fileName(url: string): string {
  try {
    const { pathname } = new URL(url);
    const name = pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : '(index)';
  } catch {
    return url;
  }
}

export function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/** Host without scheme, e.g. `cdn.example.com:8080`. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Path plus query, e.g. `/static/js/main.js?v=2`. */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

/** Path segments (directories + file) without the query, for trees and breadcrumbs. */
export function pathSegments(url: string): string[] {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    return segments.length ? segments : ['(index)'];
  } catch {
    return [url];
  }
}
