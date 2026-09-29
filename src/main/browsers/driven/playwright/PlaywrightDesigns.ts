import type { BrowserContext, Disposable } from 'playwright-core';
import { designStyleCall, OVERLAY_JS, overlayCall, type PageDesign } from '../../../overlay';
import type { TabDesigns } from '../types';
import { withDesignAside } from '../withDesignAside';
import type { PlaywrightTab } from './types';

/** A tab's window, read in its page. */
const WINDOW_SIZE = '({ width: innerWidth, height: innerHeight })';

/**
 * The app's design over the tabs of a browser driven through Playwright: the app page's overlay code, style and image
 * as scripts of every new document (in the page's own world: Playwright has no other), run in each tab's document
 * loaded now; the page laid out at the design's width (its viewport) while that is on, its own size back after.
 */
export class PlaywrightDesigns implements TabDesigns<PlaywrightTab> {
  private design: PageDesign | null = null;
  private scripts: Disposable[] = [];
  private style: Disposable | null = null;
  private key = '';
  /** Each tab's own window, while it is laid out at a design's width. */
  private readonly sizes = new Map<PlaywrightTab, { width: number; height: number }>();

  constructor(private readonly context: BrowserContext) {}

  async set(design: PageDesign | null, tabs: readonly PlaywrightTab[]): Promise<void> {
    this.design = design;
    await this.style?.dispose();
    this.style = null;
    if (!design || this.key !== design.key) {
      await Promise.all(this.scripts.splice(0).map((script) => script.dispose()));
      this.key = '';
      await Promise.all(tabs.map((tab) => this.run(tab, [overlayCall('remove')])));
    }
    if (design && !this.key) {
      const image = overlayCall('setImage', design.base64);
      this.scripts = await Promise.all([OVERLAY_JS, image].map((content) => this.context.addInitScript({ content })));
      this.key = design.key;
      await Promise.all(tabs.map((tab) => this.run(tab, [OVERLAY_JS, image])));
    }
    if (design) {
      const style = designStyleCall(design, false);
      this.style = await this.context.addInitScript({ content: style });
      await Promise.all(tabs.map((tab) => this.run(tab, [style])));
    }
    await Promise.all(tabs.map((tab) => this.fit(tab, design)));
  }

  async found(tab: PlaywrightTab): Promise<void> {
    // New documents get the scripts; only the width is the tab's own.
    if (this.design) await this.fit(tab, this.design);
  }

  hidden<R>(tab: PlaywrightTab, task: () => Promise<R>): Promise<R> {
    return withDesignAside(() => this.design, (design, aside) => this.lay(tab, design, aside), task);
  }

  gone(tab: PlaywrightTab): void {
    this.sizes.delete(tab);
  }

  /** Styles a tab's design as it is, or hidden with the page at its own width (`aside`, for a capture). */
  private async lay(tab: PlaywrightTab, design: PageDesign, aside: boolean): Promise<void> {
    await tab.page.evaluate(designStyleCall(design, aside)).catch(() => undefined);
    await this.fit(tab, aside ? null : design);
  }

  /** Runs each expression in turn in a tab's document (one that is going away is left). */
  private async run({ page }: PlaywrightTab, expressions: string[]): Promise<void> {
    for (const expression of expressions) await page.evaluate(expression).catch(() => undefined);
  }

  /** The tab's page at the design's width (its window's height kept) while that is on, else at its own size. */
  private async fit(tab: PlaywrightTab, design: PageDesign | null): Promise<void> {
    const own = this.sizes.get(tab);
    if (design?.settings.fitWidth) {
      const size = own ?? (await tab.page.evaluate<{ width: number; height: number }>(WINDOW_SIZE));
      this.sizes.set(tab, size);
      await tab.page.setViewportSize({ width: design.width, height: size.height }).catch(() => undefined);
    } else if (own) {
      this.sizes.delete(tab);
      await tab.page.setViewportSize(own).catch(() => undefined);
    }
  }
}
