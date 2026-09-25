import type { CreateOverrideInput } from '../../shared/types';
import { MAX_HAR_OVERRIDES } from './constants';
import { overrideFromHar } from './overrideFromHar';

/**
 * The response overrides a HAR's entries make: one per request (URL pattern, method and operation), the
 * last response to it winning, at most `MAX_HAR_OVERRIDES`. `skipped` counts the entries left out.
 */
export function overridesFromHar(entries: readonly unknown[]): { overrides: CreateOverrideInput[]; skipped: number } {
  const byRequest = new Map<string, CreateOverrideInput>();
  for (const entry of entries) {
    const input = overrideFromHar(entry);
    if (!input) continue;
    const key = JSON.stringify([input.match?.pattern, input.request?.method, input.request?.operation]);
    // The latest response to it: moved to the end, as the newest.
    byRequest.delete(key);
    byRequest.set(key, input);
  }
  const overrides = [...byRequest.values()].slice(-MAX_HAR_OVERRIDES);
  return { overrides, skipped: entries.length - overrides.length };
}
