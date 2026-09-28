import { nativeImage } from 'electron';
import { THUMB } from './constants';

/** A small JPEG of an image's top (at most a square of it), for lists; null when it can't be decoded. */
export function makeThumbnail(bytes: Buffer): Buffer | null {
  const image = nativeImage.createFromBuffer(bytes);
  if (image.isEmpty()) return null;
  const { width, height } = image.getSize();
  const top = height > width ? image.crop({ x: 0, y: 0, width, height: width }) : image;
  return top.resize({ width: Math.min(THUMB.width, width), quality: 'good' }).toJPEG(THUMB.quality);
}
