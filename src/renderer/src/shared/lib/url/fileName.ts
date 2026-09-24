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
