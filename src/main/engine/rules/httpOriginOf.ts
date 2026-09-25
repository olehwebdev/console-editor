import { HTTP_SCHEME } from '../../constants';
import { parseUrl } from '../../parseUrl';

/** The origin of an http(s) URL; undefined for anything else (about:blank, data:, an error page). */
export function httpOriginOf(url: string | undefined): string | undefined {
  return url && HTTP_SCHEME.test(url) ? parseUrl(url)?.origin : undefined;
}
