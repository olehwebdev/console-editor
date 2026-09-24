import type { OverrideMatcher } from './OverrideMatcher';
import type { EngineOptions } from './types';

/** Joins an override id and a URL into a `reported` key. */
const MISSED_KEY_SEPARATOR = '|';

/**
 * Reports enabled overrides that matched a file which arrived unmodified, once
 * per override and URL until the next navigation.
 */
export class MissedOverrides {
  /** `${overrideId}|${url}` already reported as missed since the last navigation. */
  private readonly reported = new Set<string>();

  constructor(
    private readonly matcher: OverrideMatcher,
    private readonly opts: Pick<EngineOptions, 'emit'>,
  ) {}

  /**
   * An enabled override matched a file that arrived unmodified. Chromium has at
   * least one such gap (an out-of-process iframe navigating back to its
   * parent's site); telling the user to reload beats failing silently.
   */
  report(url: string, resourceType: string): void {
    const override = this.matcher.find(url, resourceType);
    if (!override) return;
    const key = `${override.id}${MISSED_KEY_SEPARATOR}${url}`;
    if (this.reported.has(key)) return;
    this.reported.add(key);
    this.opts.emit({ type: 'override-missed', overrideId: override.id, url });
  }

  /** A new document committed: its misses are reported afresh. */
  clear(): void {
    this.reported.clear();
  }
}
