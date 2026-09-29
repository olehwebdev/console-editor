import { WEBP } from './constants';

/** A WebP's size, from its first chunk (lossy, lossless or extended); null when it is none of them. */
export function webpSize(bytes: Buffer): { width: number; height: number } | null {
  const chunk = bytes.toString('latin1', WEBP.chunkAt, WEBP.chunkAt + 4);
  const at = WEBP.dataAt;
  if (bytes.length < at + 10) return null;
  // Lossy: a frame tag, then 14-bit width and height.
  if (chunk === WEBP.lossy) return { width: bytes.readUInt16LE(at + 6) & 0x3fff, height: bytes.readUInt16LE(at + 8) & 0x3fff };
  // Lossless: a signature byte, then 14-bit width − 1 and height − 1, packed.
  if (chunk === WEBP.lossless) {
    const bits = bytes.readUInt32LE(at + 1);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  // Extended: 24-bit canvas width − 1 and height − 1.
  if (chunk === WEBP.extended) return { width: bytes.readUIntLE(at + 4, 3) + 1, height: bytes.readUIntLE(at + 7, 3) + 1 };
  return null;
}
