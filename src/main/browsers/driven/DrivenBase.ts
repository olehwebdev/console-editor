import type { CaptureArea, DrivenBrowser } from '../../../shared/types';
import type { CapturedImage } from '../../shots/capture';
import type { FoundBrowser } from '../types';
import { DrivenTabs } from './DrivenTabs';
import type { DriverDeps, KeptTab, TabCapture, TabRead } from './types';

/** What every driven browser does the same way, whatever protocol it speaks: its tabs, listed, read again and captured. */
export abstract class DrivenBase<T extends KeptTab> {
  protected readonly tabs = new DrivenTabs<T>();
  protected readonly disposers: Array<() => void> = [];

  constructor(
    readonly browser: FoundBrowser,
    private readonly version: string | null,
    protected readonly deps: DriverDeps,
  ) {}

  list(): DrivenBrowser {
    return this.tabs.described(this.browser, this.version);
  }

  /**
   * Reads each tab's title and address again: a title a page sets isn't announced (only its address is), so it is
   * read once the page has loaded, and whenever the tabs are listed.
   */
  async readTabs(ids = this.tabs.list().map((t) => t.id)): Promise<void> {
    if (this.tabs.updateAll(await this.read(ids))) this.deps.changed();
  }

  /** Captures a tab (brought to the front first: a hidden tab isn't drawn); with the address it showed. */
  async capture(tabId: string, area: Exclude<CaptureArea, 'element'>): Promise<TabCapture> {
    const tab = this.tabs.get(tabId);
    await this.activate(tabId);
    return { image: await this.take(tab, area), url: tab.info.url };
  }

  /** Brings a tab to the front, in its window. */
  abstract activate(tabId: string): Promise<void>;

  /** What the browser says of each tab now. */
  protected abstract read(ids: string[]): Promise<TabRead[]>;

  /** Captures a tab that is in front. */
  protected abstract take(tab: T, area: Exclude<CaptureArea, 'element'>): Promise<CapturedImage>;

  /** Lets go of what was listened to. */
  protected dispose(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
  }
}
