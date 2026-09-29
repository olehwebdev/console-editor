import { CHANNELS } from './constants';
import type { ComparedPixels, Pixels } from './types';

/** An image's pixels with each one's RGBA also as one number. */
export function comparedOf(pixels: Pixels): ComparedPixels {
  const { buffer, byteOffset, length } = pixels.data;
  return { ...pixels, colors: new Uint32Array(buffer, byteOffset, length / CHANNELS) };
}
