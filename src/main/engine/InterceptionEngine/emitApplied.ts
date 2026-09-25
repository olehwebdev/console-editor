import type { EngineOptions } from './types';

/** One `rule-applied` per rule that changed something, once Chromium took the change. */
export function emitApplied(opts: Pick<EngineOptions, 'emit'>, ruleIds: readonly string[], url: string): void {
  for (const ruleId of ruleIds) opts.emit({ type: 'rule-applied', ruleId, url });
}
