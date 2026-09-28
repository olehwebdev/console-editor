import type { OverlaySettings } from '../../shared/types';
import { CDP } from '../engine/constants';
import type { CdpTransport } from '../engine/cdp';
import { OVERLAY_GLOBAL, OVERLAY_WORLD } from './constants';
import { overlayCall } from './overlayCall';
import { OVERLAY_JS } from './overlaySource';
import { overlayStyle } from './overlayStyle';

/**
 * A design laid over a page's top frame through its CDP session: its code, style and image are put in every new
 * document (in the overlay's world), and in the one loaded now. Changing the style replaces only the style's script.
 */
export class PageOverlay {
  private scripts: { code?: string; style?: string; image?: string } = {};

  constructor(private readonly transport: CdpTransport) {}

  /** Lays `base64` (an image file, `width` × `height` CSS pixels) over the page as set, replacing any design laid there before. */
  async show(base64: string, settings: OverlaySettings, width: number, height: number): Promise<void> {
    const css = overlayStyle(settings, width, height);
    const { blend } = settings;
    await this.remove();
    this.scripts = { code: await this.add(OVERLAY_JS), style: await this.add(overlayCall('setStyle', css, blend)), image: await this.add(overlayCall('setImage', base64)) };
    const world = await this.world();
    await this.run(world, OVERLAY_JS);
    await this.run(world, overlayCall('setStyle', css, blend));
    await this.run(world, overlayCall('setImage', base64));
  }

  async restyle(settings: OverlaySettings, width: number, height: number): Promise<void> {
    const css = overlayStyle(settings, width, height);
    const { blend } = settings;
    if (this.scripts.style) await this.transport.send(CDP.Page.removeScriptToEvaluateOnNewDocument, { identifier: this.scripts.style }).catch(() => undefined);
    this.scripts.style = await this.add(overlayCall('setStyle', css, blend));
    await this.run(await this.world(), overlayCall('setStyle', css, blend));
  }

  async remove(): Promise<void> {
    const ids = Object.values(this.scripts);
    this.scripts = {};
    if (!ids.length) return;
    await Promise.all(ids.map((identifier) => this.transport.send(CDP.Page.removeScriptToEvaluateOnNewDocument, { identifier }).catch(() => undefined)));
    await this.run(await this.world(), `globalThis.${OVERLAY_GLOBAL} && ${overlayCall('remove')}`).catch(() => undefined);
  }

  private async add(source: string): Promise<string> {
    const { identifier } = await this.transport.send<{ identifier: string }>(CDP.Page.addScriptToEvaluateOnNewDocument, { source, worldName: OVERLAY_WORLD });
    return identifier;
  }

  /** The overlay's world in the document loaded now (made the first time, the same one after). */
  private async world(): Promise<number> {
    const { frameTree } = await this.transport.send<{ frameTree: { frame: { id: string } } }>(CDP.Page.getFrameTree);
    const { executionContextId } = await this.transport.send<{ executionContextId: number }>(CDP.Page.createIsolatedWorld, { frameId: frameTree.frame.id, worldName: OVERLAY_WORLD });
    return executionContextId;
  }

  private async run(contextId: number, expression: string): Promise<void> {
    const { exceptionDetails } = await this.transport.send<{ exceptionDetails?: { exception?: { description?: string } } }>(CDP.Runtime.evaluate, { expression, contextId, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'The overlay could not be laid over the page');
  }
}
