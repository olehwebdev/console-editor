import { BIDI, type BidiConnection } from '../../../engine/bidi';
import { designStyleCall, OVERLAY_JS, OVERLAY_WORLD, overlayCall, type PageDesign } from '../../../overlay';
import type { KeptTab, TabDesigns } from '../types';
import { withDesignAside } from '../withDesignAside';
import { HEIGHT_EXPRESSION } from './constants';
import { evaluateIn } from './evaluateIn';

/**
 * The app's design over Firefox's tabs: the app page's overlay code, style and image as preload scripts in a sandbox
 * of every new document (a page's scripts can't reach it), run in each tab's document loaded now; the page laid out at
 * the design's width (BiDi's viewport) while that is on.
 */
export class FirefoxDesigns implements TabDesigns<KeptTab> {
  private design: PageDesign | null = null;
  private scripts: { code?: string; style?: string; image?: string } = {};
  private key = '';

  constructor(private readonly connection: BidiConnection) {}

  async set(design: PageDesign | null, tabs: readonly KeptTab[]): Promise<void> {
    this.design = design;
    if (!design) {
      this.key = '';
      await this.unload(Object.values(this.scripts));
      this.scripts = {};
      await Promise.all(tabs.map((tab) => this.run(tab, [overlayCall('remove')]).then(() => this.fit(tab, null))));
      return;
    }
    const style = designStyleCall(design, false);
    if (this.key === design.key) {
      await this.unload([this.scripts.style]);
      this.scripts.style = await this.preload(style);
      await Promise.all(tabs.map((tab) => this.run(tab, [style])));
    } else {
      await this.unload(Object.values(this.scripts));
      const image = overlayCall('setImage', design.base64);
      this.scripts = { code: await this.preload(OVERLAY_JS), style: await this.preload(style), image: await this.preload(image) };
      this.key = design.key;
      await Promise.all(tabs.map((tab) => this.run(tab, [OVERLAY_JS, style, image])));
    }
    await Promise.all(tabs.map((tab) => this.fit(tab, design)));
  }

  async found(tab: KeptTab): Promise<void> {
    // New documents get the preload scripts; only the width is the tab's own.
    if (this.design) await this.fit(tab, this.design);
  }

  hidden<R>(tab: KeptTab, task: () => Promise<R>): Promise<R> {
    return withDesignAside(() => this.design, (design, aside) => this.lay(tab, design, aside), task);
  }

  gone(): void {
    // Preload scripts are the browser's, not a tab's: nothing is kept per tab.
  }

  /** Styles a tab's design as it is, or hidden with the page at its own width (`aside`, for a capture). */
  private async lay(tab: KeptTab, design: PageDesign, aside: boolean): Promise<void> {
    await this.run(tab, [designStyleCall(design, aside)]);
    await this.fit(tab, aside ? null : design);
  }

  /** Runs each expression in turn in a tab's document, in the overlay's sandbox. */
  private async run(tab: KeptTab, expressions: string[]): Promise<void> {
    for (const expression of expressions) await evaluateIn(this.connection, tab.info.id, expression, true, OVERLAY_WORLD);
  }

  /** The tab's page at the design's width (its window's height kept) while that is on, else at its own. */
  private async fit(tab: KeptTab, design: PageDesign | null): Promise<void> {
    const context = tab.info.id;
    const height = design?.settings.fitWidth ? Number(await evaluateIn(this.connection, context, HEIGHT_EXPRESSION)) : 0;
    const viewport = design?.settings.fitWidth ? { width: design.width, height: height || design.height } : null;
    await this.connection.send(BIDI.browsingContext.setViewport, { context, viewport }).catch(() => undefined);
  }

  private async preload(expression: string): Promise<string> {
    const { script } = await this.connection.send<{ script: string }>(BIDI.script.addPreloadScript, { functionDeclaration: `() => { ${expression}; }`, sandbox: OVERLAY_WORLD });
    return script;
  }

  private async unload(scripts: Array<string | undefined>): Promise<void> {
    await Promise.all(scripts.filter((script) => script !== undefined).map((script) => this.connection.send(BIDI.script.removePreloadScript, { script }).catch(() => undefined)));
  }
}
