import type { Settings } from '../../shared/types';
import { SETTING_CHECKS } from './settingChecks';

/** Keeps only known settings holding what they may, so a corrupt or old file can't inject junk. */
export function pickKnown(input: Partial<Settings>): Partial<Settings> {
  const values = (input ?? {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(SETTING_CHECKS).flatMap(([key, valid]) => (valid(values[key]) ? [[key, values[key]]] : []))) as Partial<Settings>;
}
