import { nativeImage } from 'electron';

/** The longest side, in pixels, of a site icon kept for its workspace. */
const FAVICON_SIZE = 32;

/** An icon scaled down to at most `FAVICON_SIZE` on its longest side, as a PNG data URL; null if it can't be decoded. */
export function shrinkFavicon(bytes: Buffer): string | null {
  const image = nativeImage.createFromBuffer(bytes);
  if (image.isEmpty()) return null;
  const { width, height } = image.getSize();
  const small =
    Math.max(width, height) > FAVICON_SIZE
      ? image.resize(width >= height ? { width: FAVICON_SIZE, quality: 'best' } : { height: FAVICON_SIZE, quality: 'best' })
      : image;
  return small.toDataURL();
}
