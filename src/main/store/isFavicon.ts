import { IMAGE_DATA_URL } from '../constants';

/** The longest icon kept (see favicon/ for the size it is held to). */
const MAX_FAVICON_CHARS = 128 * 1024;

/** A favicon as kept: a data URL of an image, not too big. */
export function isFavicon(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_FAVICON_CHARS && IMAGE_DATA_URL.test(value);
}
