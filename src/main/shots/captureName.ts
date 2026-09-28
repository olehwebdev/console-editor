import type { CaptureArea } from '../../shared/types';
import { AREA_SUFFIX, CAPTURE_FORMAT, MAX_NAME_STEM, NAME_UNSAFE } from './constants';

/** What a capture is named after when its page isn't a web page's address (`about:blank`, a file). */
const FALLBACK_STEM = 'page';

const WEB_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/** A capture's file name, after the page and what it covers: `shop.test-cart-1440-full.png`. */
export function captureName(pageUrl: string, viewportWidth: number, area: CaptureArea): string {
  let stem = FALLBACK_STEM;
  try {
    const { host, pathname, protocol } = new URL(pageUrl);
    if (!WEB_PROTOCOLS.has(protocol)) throw new Error('Not a web page');
    stem = `${host}${pathname === '/' ? '' : pathname}`.replace(NAME_UNSAFE, '-').replace(/^-+|-+$/g, '').slice(0, MAX_NAME_STEM) || FALLBACK_STEM;
  } catch {
    // Not a web page's address: the fallback.
  }
  return `${stem}-${Math.round(viewportWidth)}${AREA_SUFFIX[area]}.${CAPTURE_FORMAT}`;
}
