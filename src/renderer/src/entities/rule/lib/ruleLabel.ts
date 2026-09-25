import type { UrlMatcher } from '@common/types';
import { fileName } from '@/shared/lib';

/** How a rule is named in lists and tabs: an exact URL as `file · host` (the host alone for a site's root), any other pattern as written. */
export function ruleLabel({ match }: { match: UrlMatcher }): string {
  if (match.type !== 'exact' || !URL.canParse(match.pattern)) return match.pattern;
  const { host, pathname } = new URL(match.pattern);
  return pathname.split('/').some(Boolean) ? `${fileName(match.pattern)} · ${host}` : host;
}
