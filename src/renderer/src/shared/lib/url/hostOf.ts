/** Host without scheme, e.g. `cdn.example.com:8080`. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
