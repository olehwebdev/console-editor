import { readPngSize } from '../readPngSize';
import { SIGNATURES, WEBP } from './constants';
import { jpegSize } from './jpegSize';
import { startsWith } from './startsWith';
import type { ImageInfo } from './types';
import { webpSize } from './webpSize';

/** An image's type (PNG, JPEG or WebP) and size, from its bytes (whatever its name says); null for anything else. */
export function imageInfo(bytes: Buffer): ImageInfo | null {
  try {
    if (startsWith(bytes, SIGNATURES.png)) return { ext: 'png', ...readPngSize(bytes) };
    if (startsWith(bytes, SIGNATURES.jpg)) {
      const size = jpegSize(bytes);
      return size && { ext: 'jpg', ...size };
    }
    if (startsWith(bytes, SIGNATURES.riff) && startsWith(bytes, SIGNATURES.webp, WEBP.tagAt)) {
      const size = webpSize(bytes);
      return size && { ext: 'webp', ...size };
    }
  } catch {
    // Cut short: not an image to keep.
  }
  return null;
}
