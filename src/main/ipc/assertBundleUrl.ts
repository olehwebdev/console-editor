import { HTTP_URL } from '../constants';
import { MAX_URL_CHARS } from './constants';

/** Checks a bundle URL from the renderer: an http(s) URL of a length a listed file can have. */
export function assertBundleUrl(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length > MAX_URL_CHARS || !HTTP_URL.test(value)) throw new Error('bundleUrl must be an http(s) URL');
}
