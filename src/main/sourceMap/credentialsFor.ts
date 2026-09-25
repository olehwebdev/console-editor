import { originOf } from './originOf';

/**
 * Whether a map request carries the site's cookies: only to the bundle's own origin or the page's,
 * never to a host the page merely names (the session is shared by every workspace).
 */
export function credentialsFor(targetUrl: string, bundleUrl: string, pageUrl: string): 'include' | 'omit' {
  const target = originOf(targetUrl);
  return target !== null && (target === originOf(bundleUrl) || target === originOf(pageUrl)) ? 'include' : 'omit';
}
