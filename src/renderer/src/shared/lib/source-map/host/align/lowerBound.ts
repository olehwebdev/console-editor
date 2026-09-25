/** The first index whose value is at least `value` (the length if there is none). */
export function lowerBound(sorted: ArrayLike<number>, value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sorted[mid]! < value) low = mid + 1;
    else high = mid;
  }
  return low;
}
