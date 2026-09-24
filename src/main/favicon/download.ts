import { HTTP_SCHEME } from '../constants';
import { IMAGE_TYPE, MAX_KEPT } from './constants';
import { imageType } from './imageType';
import { readCapped } from './readCapped';
import type { FaviconDeps, ImageType } from './types';

/** Bigger downloads aren't favicons (a site that answers /favicon.ico with a page, say). */
const MAX_DOWNLOAD = 256 * 1024;

/** The types `shrink` can decode, and so scale down. */
const SCALABLE: ReadonlySet<ImageType> = new Set([IMAGE_TYPE.png, IMAGE_TYPE.jpeg]);

/** The icon at `url` as a data URL: scaled down if it can be, else as it is when small. Null if it isn't an image. */
export async function download(url: string, deps: FaviconDeps): Promise<string | null> {
  if (!HTTP_SCHEME.test(url)) return null;
  const res = await deps.fetch(url);
  if (!res.ok) {
    void res.body?.cancel().catch(() => undefined);
    return null;
  }
  const bytes = await readCapped(res, MAX_DOWNLOAD);
  const type = bytes?.length ? imageType(bytes) : null;
  if (!bytes || !type) return null;
  if (SCALABLE.has(type)) {
    const small = deps.shrink(bytes);
    if (small) return small;
  }
  return bytes.length <= MAX_KEPT ? `data:${type};base64,${bytes.toString('base64')}` : null;
}
