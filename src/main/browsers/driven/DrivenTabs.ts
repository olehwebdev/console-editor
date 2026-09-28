import type { DrivenTab } from '../../../shared/types';
import { START_URL } from './constants';
import type { DrivenTabState, PageTargetInfo } from './types';

/** A driven browser's tabs, in the order they were attached; waits for the tab a new target becomes. */
export class DrivenTabs {
  private readonly tabs = new Map<string, DrivenTabState>();
  private readonly arrivals = new Map<string, (tab: DrivenTabState) => void>();

  add(tab: DrivenTabState): void {
    this.tabs.set(tab.info.id, tab);
    this.arrivals.get(tab.info.id)?.(tab);
    this.arrivals.delete(tab.info.id);
  }

  /** Forgets the tab whose session went, and returns it. */
  remove(sessionId: string): DrivenTabState | undefined {
    const tab = this.all().find((t) => t.sessionId === sessionId);
    if (tab) this.tabs.delete(tab.info.id);
    return tab;
  }

  /** Takes a tab's new address or title; false when it isn't a tab here, or neither changed. */
  update({ targetId, url, title }: PageTargetInfo): boolean {
    const tab = this.tabs.get(targetId);
    if (!tab || (tab.info.url === url && tab.info.title === title)) return false;
    tab.info = { ...tab.info, url, title };
    return true;
  }

  get(id: string): DrivenTabState {
    const tab = this.tabs.get(id);
    if (!tab) throw new Error('That tab is closed');
    return tab;
  }

  /** The tab of a target just created, once it is attached. */
  arrival(targetId: string): Promise<DrivenTabState> {
    const tab = this.tabs.get(targetId);
    return tab ? Promise.resolve(tab) : new Promise((resolve) => this.arrivals.set(targetId, resolve));
  }

  /** A blank tab (the one the browser started on) to load an address in, rather than opening another. */
  blank(): DrivenTabState | undefined {
    return this.all().find((t) => t.info.url === START_URL);
  }

  all(): DrivenTabState[] {
    return [...this.tabs.values()];
  }

  list(): DrivenTab[] {
    return this.all().map((t) => t.info);
  }

  /** Forgets every tab, and returns them. */
  clear(): DrivenTabState[] {
    const all = this.all();
    this.tabs.clear();
    this.arrivals.clear();
    return all;
  }
}
