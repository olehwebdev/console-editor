import { BUNDLE_KEY_PREFIX } from '../constants';

/** The Explorer key of a bundle's nest of originals (its open state). */
export function bundleNestKey(bundleUrl: string): string {
  return BUNDLE_KEY_PREFIX + bundleUrl;
}
