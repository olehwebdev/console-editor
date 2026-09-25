import type { Override, Settings } from '../../../shared/types';
import { computeFetchPatterns } from './computeFetchPatterns';
import { WORKER_SCRIPT_PATTERNS } from './constants';
import type { FetchPattern } from './types';

/**
 * A service or shared worker session's patterns: the overrides', plus every
 * script it loads, so its scripts are listed from their pause and the list is
 * never empty (its Fetch must never be disabled, see `WorkerSettingsApplier`).
 */
export function workerFetchPatterns(overrides: Override[], settings: Settings): FetchPattern[] {
  const patterns = computeFetchPatterns(overrides, settings);
  const has = (p: FetchPattern) => patterns.some((q) => q.urlPattern === p.urlPattern && q.resourceType === p.resourceType);
  return [...patterns, ...WORKER_SCRIPT_PATTERNS.filter((p) => !has(p))];
}
