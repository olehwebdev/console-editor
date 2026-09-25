import { KILO, SIZE_UNITS } from './constants';

/** A row's size: bytes as B, kB or MB (empty until the request has finished). */
export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return '';
  let value = bytes;
  let unit = 0;
  while (value >= KILO && unit < SIZE_UNITS.length - 1) {
    value /= KILO;
    unit += 1;
  }
  return unit ? `${value.toFixed(1)} ${SIZE_UNITS[unit]}` : `${value} B`;
}
