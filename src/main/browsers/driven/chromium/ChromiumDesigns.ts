import { PageOverlay, type PageDesign } from '../../../overlay';
import type { TabDesigns } from '../types';
import { fitTab } from './fitTab';
import type { DrivenTabState } from './types';

/**
 * The app's design over a Chromium browser's tabs: each tab its own {@link PageOverlay} on its session (the app page's
 * code), the page laid out at the design's width while that is on.
 */
export class ChromiumDesigns implements TabDesigns<DrivenTabState> {
  private design: PageDesign | null = null;
  /** Each tab's overlay, and which design's image it has (a restyle keeps it). */
  private readonly laid = new Map<string, { overlay: PageOverlay; key: string }>();

  async set(design: PageDesign | null, tabs: readonly DrivenTabState[]): Promise<void> {
    this.design = design;
    await Promise.all(tabs.map((tab) => this.lay(tab, design).catch(() => undefined)));
  }

  async found(tab: DrivenTabState): Promise<void> {
    if (!this.design) return;
    await tab.ready;
    await this.lay(tab, this.design).catch(() => undefined);
  }

  async hidden<R>(tab: DrivenTabState, task: () => Promise<R>): Promise<R> {
    const design = this.design;
    if (!design) return task();
    await this.lay(tab, { ...design, settings: { ...design.settings, hidden: true, fitWidth: false } }).catch(() => undefined);
    try {
      return await task();
    } finally {
      if (this.design) await this.lay(tab, this.design).catch(() => undefined);
    }
  }

  gone(tab: DrivenTabState): void {
    this.laid.delete(tab.info.id);
  }

  private async lay(tab: DrivenTabState, design: PageDesign | null): Promise<void> {
    const laid = this.laid.get(tab.info.id) ?? { overlay: new PageOverlay(tab.transport), key: '' };
    this.laid.set(tab.info.id, laid);
    if (!design) {
      laid.key = '';
      await laid.overlay.remove();
      return fitTab(tab.transport, null);
    }
    const { key, base64, width, height, settings } = design;
    if (laid.key === key) await laid.overlay.restyle(settings, width, height);
    else await laid.overlay.show(base64, settings, width, height);
    laid.key = key;
    await fitTab(tab.transport, settings.fitWidth ? width : null);
  }
}
