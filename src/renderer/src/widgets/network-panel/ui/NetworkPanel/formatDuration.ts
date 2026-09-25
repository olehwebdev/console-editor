import { SECOND_MS } from './constants';

/** A row's time: ms under a second, seconds above (empty until the request has ended). */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return '';
  return ms < SECOND_MS ? `${Math.round(ms)} ms` : `${(ms / SECOND_MS).toFixed(2)} s`;
}
