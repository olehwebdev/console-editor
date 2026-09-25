/** A URL path segment as a name (as written if it isn't valid percent-encoding). */
export function decodePart(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}
