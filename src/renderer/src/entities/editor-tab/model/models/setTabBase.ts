import { entries } from './entries';

export function setTabBase(tabId: string, base: string): void {
  const entry = entries.get(tabId);
  if (entry) entry.base = base;
}
