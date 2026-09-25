import { MS_PER_SECOND } from './constants';

/** The ms between two of CDP's monotonic timestamps (in seconds). */
export function durationMs(from: number, to: number): number {
  return Math.max(0, Math.round((to - from) * MS_PER_SECOND));
}
