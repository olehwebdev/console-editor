import { SOURCE_KEY_SEPARATOR } from './constants';

/** Identifies an original of one bundle's map: the same file can be in several bundles. */
export function sourceKey(bundleUrl: string, url: string): string {
  return `${bundleUrl}${SOURCE_KEY_SEPARATOR}${url}`;
}
