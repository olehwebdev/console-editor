import { parseUrl } from '../../parseUrl';

/** The origin of `url`, or `url` itself when it isn't a valid absolute URL. */
export function originOf(url: string): string {
  return parseUrl(url)?.origin ?? url;
}
