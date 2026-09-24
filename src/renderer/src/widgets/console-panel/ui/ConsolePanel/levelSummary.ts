import { CONSOLE_LEVELS, type ConsoleLevel } from '@common/types';
import { DEFAULT_LEVELS } from '@/features/filter-console';

/** The level menu's button text, as DevTools words it. */
export function levelSummary(levels: Readonly<Record<ConsoleLevel, boolean>>): string {
  if (CONSOLE_LEVELS.every((l) => levels[l] === DEFAULT_LEVELS[l])) return 'Default levels';
  if (CONSOLE_LEVELS.every((l) => levels[l])) return 'All levels';
  if (!CONSOLE_LEVELS.some((l) => levels[l])) return 'No levels';
  return 'Custom levels';
}
