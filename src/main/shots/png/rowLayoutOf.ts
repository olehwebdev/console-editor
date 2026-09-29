import { CHANNELS_OF, HEADER_AT, JOINED_DEPTHS, NOT_INTERLACED } from './constants';
import type { RowLayout } from './types';

/** How the rows of a PNG with this header are laid out; it throws for one that isn't joined (a palette, bits, interlaced). */
export function rowLayoutOf(header: Buffer): RowLayout {
  const channels = CHANNELS_OF[header[HEADER_AT.colorType]];
  const depth = header[HEADER_AT.depth];
  if (!channels || !JOINED_DEPTHS.has(depth) || header[HEADER_AT.interlace] !== NOT_INTERLACED) throw new Error("The capture's parts can't be joined");
  const pixelBytes = (channels * depth) / 8;
  return { pixelBytes, rowBytes: header.readUInt32BE(HEADER_AT.width) * pixelBytes + 1 };
}
