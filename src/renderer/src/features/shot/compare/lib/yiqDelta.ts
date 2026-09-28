/**
 * How far apart two colours look, as YIQ distance (brightness weighed most, as the eye does), each blended onto white
 * by its alpha first. 0 for the same colour, `MAX_YIQ_DELTA` for black against white.
 */
export function yiqDelta(a: ArrayLike<number>, i: number, b: ArrayLike<number>, j: number): number {
  const blend = (value: number, alpha: number) => 255 + (value - 255) * (alpha / 255);
  const [r1, g1, b1] = [blend(a[i], a[i + 3]), blend(a[i + 1], a[i + 3]), blend(a[i + 2], a[i + 3])];
  const [r2, g2, b2] = [blend(b[j], b[j + 3]), blend(b[j + 1], b[j + 3]), blend(b[j + 2], b[j + 3])];
  const y = r1 * 0.29889531 + g1 * 0.58662247 + b1 * 0.11448223 - (r2 * 0.29889531 + g2 * 0.58662247 + b2 * 0.11448223);
  const iq = r1 * 0.59597799 - g1 * 0.2741761 - b1 * 0.32180189 - (r2 * 0.59597799 - g2 * 0.2741761 - b2 * 0.32180189);
  const q = r1 * 0.21147017 - g1 * 0.52261711 + b1 * 0.31114694 - (r2 * 0.21147017 - g2 * 0.52261711 + b2 * 0.31114694);
  return 0.5053 * y * y + 0.299 * iq * iq + 0.1957 * q * q;
}
