import { findBlockRule } from '../rules';
import { MISSED_KEY_SEPARATOR } from './constants';
import { MatcherCache } from './MatcherCache';
import { isPageDocument } from './isPageDocument';
import type { ResourceTrackerContext } from './types';

/**
 * Reports enabled block rules that matched a file which arrived anyway, once
 * per rule and URL until the next navigation.
 */
export class MissedRules {
  /** `${ruleId}|${url}` already reported as missed since the last navigation. */
  private readonly reported = new Set<string>();
  private readonly matchers = new MatcherCache();

  constructor(private readonly ctx: Pick<ResourceTrackerContext, 'frames' | 'opts'>) {}

  /**
   * A blocked request never gets a response, so it was in flight before the
   * rule, or Chromium had an interception gap. The page's own document is
   * never blocked, so never missed.
   */
  report(url: string, resourceType: string, frameId: string | undefined): void {
    const { frames, opts } = this.ctx;
    if (isPageDocument(resourceType, frameId, frames, !!opts.iframe)) return;
    const rule = findBlockRule(opts.getRules(), url, resourceType, this.matchers);
    if (!rule) return;
    const key = `${rule.id}${MISSED_KEY_SEPARATOR}${url}`;
    if (this.reported.has(key)) return;
    this.reported.add(key);
    opts.emit({ type: 'rule-missed', ruleId: rule.id, url });
  }

  /** A new document committed: its misses are reported afresh. */
  clear(): void {
    this.reported.clear();
  }
}
