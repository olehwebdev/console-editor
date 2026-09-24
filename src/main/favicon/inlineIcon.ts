import { IMAGE_DATA_URL } from '../constants';
import { MAX_KEPT } from './constants';

/** A data URL icon of up to MAX_KEPT bytes, in base64 (4 characters for every 3 bytes), with room for its header. */
const MAX_DATA_URL = Math.ceil((MAX_KEPT * 4) / 3) + 64;

/** An icon given inline (`<link rel="icon" href="data:image/svg+xml,…">`), kept as it is when small. */
export function inlineIcon(url: string): string | null {
  return IMAGE_DATA_URL.test(url) && url.length <= MAX_DATA_URL ? url : null;
}
