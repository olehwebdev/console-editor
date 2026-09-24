import type { ConsoleFrame } from '@common/types';

/** What the prompt says before you type: where the code will run, or why it can't. */
export function promptPlaceholder(target: ConsoleFrame | null, label: string): string {
  if (!target) return `${label} isn't on the page — pick another frame`;
  if (!target.canRun) return `${label} has no JavaScript running`;
  return `Run code in ${label}…`;
}
