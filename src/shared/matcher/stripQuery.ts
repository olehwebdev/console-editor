/** Removes the query string and fragment from a URL. */
export function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return i === -1 ? url : url.slice(0, i);
}
