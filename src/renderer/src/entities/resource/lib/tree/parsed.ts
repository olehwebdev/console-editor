import { parseUrl } from './parseUrl';
import type { ParsedUrl } from './types';

/** Each URL is parsed once, not on every rebuild of the tree (the page reports thousands). */
const parsedUrls = new Map<string, ParsedUrl>();
const PARSED_URLS_MAX = 20_000;

export function parsed(url: string): ParsedUrl {
  let p = parsedUrls.get(url);
  if (!p) {
    if (parsedUrls.size >= PARSED_URLS_MAX) parsedUrls.clear();
    p = parseUrl(url);
    parsedUrls.set(url, p);
  }
  return p;
}
