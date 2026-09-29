/**
 * How bright a pixel is (YIQ's Y, as {@link yiqDelta} weighs it), blended onto white by its alpha, less white's own
 * (the same for every pixel, so differences are unchanged).
 */
export function brightnessOf(data: ArrayLike<number>, i: number): number {
  return ((data[i] - 255) * 0.29889531 + (data[i + 1] - 255) * 0.58662247 + (data[i + 2] - 255) * 0.11448223) * (data[i + 3] / 255);
}
