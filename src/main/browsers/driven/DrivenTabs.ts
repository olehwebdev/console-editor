import type { DrivenBrowser, DrivenTab } from '../../../shared/types';
import { HTTP_URL } from '../../constants';
import type { FoundBrowser } from '../types';
import { START_URL } from './constants';
import type { KeptTab, TabRead } from './types';

/** A driven browser's tabs, in the order they were found; waits for the tab a new one becomes. */
export class DrivenTabs<T extends KeptTab> {
  private readonly tabs = new Map<string, T>();
  private readonly arrivals = new Map<string, (tab: T) => void>();

  add(tab: T): void {
    this.tabs.set(tab.info.id, tab);
    this.arrivals.get(tab.info.id)?.(tab);
    this.arrivals.delete(tab.info.id);
  }

  has(id: string): boolean {
    return this.tabs.has(id);
  }

  /** Forgets a tab (it closed), and returns it. */
  remove(id: string): T | undefined {
    const tab = this.tabs.get(id);
    this.tabs.delete(id);
    return tab;
  }

  /** Takes a tab's new address or title; false when it isn't a tab here, or neither changed. */
  update(id: string, { url, title }: Partial<Pick<DrivenTab, 'url' | 'title'>>): boolean {
    const tab = this.tabs.get(id);
    const next = tab && { ...tab.info, ...(url === undefined ? {} : { url }), ...(title === undefined ? {} : { title }) };
    if (!tab || !next || (next.url === tab.info.url && next.title === tab.info.title)) return false;
    tab.info = next;
    return true;
  }

  /** Takes what was read of each tab again; whether anything changed. */
  updateAll(reads: readonly TabRead[]): boolean {
    return reads.filter(({ id, ...change }) => this.update(id, change)).length > 0;
  }

  get(id: string): T {
    const tab = this.tabs.get(id);
    if (!tab) throw new Error('That tab is closed');
    return tab;
  }

  /** The tab of a target just created, once it is found. */
  arrival(id: string): Promise<T> {
    const tab = this.tabs.get(id);
    return tab ? Promise.resolve(tab) : new Promise((resolve) => this.arrivals.set(id, resolve));
  }

  /** The tab showing an address, if one does. */
  showing(url: string): T | undefined {
    return this.all().find((t) => t.info.url === url);
  }

  /** A blank tab (the one the browser started on) to load an address in, rather than opening another. */
  blank(): T | undefined {
    return this.all().find((t) => t.info.url === START_URL);
  }

  /** The tabs showing a website (not a blank or browser page). */
  webPages(): T[] {
    return this.all().filter((t) => HTTP_URL.test(t.info.url));
  }

  all(): T[] {
    return [...this.tabs.values()];
  }

  list(): DrivenTab[] {
    return this.all().map((t) => t.info);
  }

  /** The browser with these tabs, as listed. */
  described({ id, name }: Pick<FoundBrowser, 'id' | 'name'>, version: string | null): DrivenBrowser {
    return { id, name, version, tabs: this.list() };
  }

  /** Forgets every tab, and returns them. */
  clear(): T[] {
    const all = this.all();
    this.tabs.clear();
    this.arrivals.clear();
    return all;
  }
}
