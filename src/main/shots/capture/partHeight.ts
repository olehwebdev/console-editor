import { WHOLE_PIXEL_SLACK, WHOLE_PIXEL_TRIES } from '../constants';

/**
 * How tall a part of a capture is, in CSS pixels, at `ratio` device pixels per CSS pixel: at most `side` device pixels,
 * and a whole number of them where a height just below allows, so each part starts on a device pixel.
 */
export function partHeight(side: number, ratio: number): number {
  const most = Math.max(1, Math.floor(side / ratio));
  for (let height = most; height > Math.max(0, most - WHOLE_PIXEL_TRIES); height--) {
    if (Math.abs(height * ratio - Math.round(height * ratio)) < WHOLE_PIXEL_SLACK) return height;
  }
  return most;
}
