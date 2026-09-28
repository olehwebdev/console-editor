/** Whether a search answers `text`: every word of `query` is in it, case aside. */
export function matchesWords(text: string, query: string): boolean {
  const haystack = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
