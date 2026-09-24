import { entries } from './entries';

export function getTabBase(tabId: string): string | undefined {
  return entries.get(tabId)?.base;
}
