import { JPEG_FRAME_MARKERS } from './constants';

/** A JPEG's size, from its first frame header (walking its segments); null when it has none. */
export function jpegSize(bytes: Buffer): { width: number; height: number } | null {
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1];
    // Fill bytes, and markers without a length.
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    const length = bytes.readUInt16BE(at + 2);
    if (JPEG_FRAME_MARKERS.has(marker)) return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    at += 2 + length;
  }
  return null;
}
