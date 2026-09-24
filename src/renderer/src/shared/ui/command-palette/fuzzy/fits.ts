/** True when `query[from..]` is a subsequence of `lower[start..]`. */
export function fits(query: string, from: number, lower: string, start: number): boolean {
  let q = from;
  for (let i = start; i < lower.length && q < query.length; i++) {
    if (lower[i] === query[q]) q++;
  }
  return q === query.length;
}
