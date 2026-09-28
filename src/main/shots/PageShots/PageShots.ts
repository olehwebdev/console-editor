import type { CaptureArea, Shot, ShotBrowser } from '../../../shared/types';
import { atWidth, captureOverCdp, type CapturedImage, type CaptureTarget } from '../capture';
import { captureName } from '../captureName';
import { APP_BROWSER, CAPTURE_FORMAT, DESIGN_NAME } from '../constants';
import { designScale } from '../designScale';
import { imageInfo } from '../imageInfo';
import { makeThumbnail } from '../makeThumbnail';
import { waitUntilShown } from '../waitUntilShown';
import type { PageShotsDeps } from './types';

/** The capture areas asked of the page as a whole (an element's goes through its pick). */
const PAGE_AREAS: ReadonlySet<unknown> = new Set<CaptureArea>(['viewport', 'page']);

/**
 * The workspace's captures and designs: taking captures of the app's page, keeping them, and every change announced
 * as `shots-changed` (the active workspace's, newest first).
 */
export class PageShots {
  constructor(private readonly deps: PageShotsDeps) {}

  list(): Shot[] {
    return this.deps.store.list();
  }

  /** The workspace whose shots are listed, and captures are added to. */
  setWorkspace(id: string): void {
    this.deps.store.setWorkspace(id);
  }

  /** Deletes every shot of a workspace (not the active one: nothing is announced). */
  removeWorkspace(id: string): Promise<void> {
    return this.deps.store.removeWorkspace(id);
  }

  /** Captures what the page's viewport shows, or all of it. */
  capture(area: unknown): Promise<Shot> {
    if (!PAGE_AREAS.has(area)) return Promise.reject(new Error('Invalid capture area'));
    return this.captureApp({ area: area as 'viewport' | 'page' });
  }

  /** Captures a pick's element (in any frame), without the inspector's highlight on it. */
  async captureElement(pickId: unknown): Promise<Shot> {
    const { inspector } = this.deps.page.frames;
    const box = await inspector.elementBox(pickId);
    await inspector.highlightPick(null);
    return this.captureApp({ area: 'element', box });
  }

  /** Keeps a capture with the active workspace, named after its page and what it covers. */
  async keep(image: CapturedImage, pageUrl: string, area: CaptureArea, browser: ShotBrowser, group: string | null = null): Promise<Shot> {
    const { bytes, width, height, scale, viewport } = image;
    const name = captureName(pageUrl, viewport.width, area);
    const shot = await this.deps.store.add({ kind: 'capture', name, width, height, scale, pageUrl, browser, viewport, area, group, bytes, ext: CAPTURE_FORMAT, thumb: makeThumbnail(bytes) });
    this.changed();
    return shot;
  }

  /**
   * Keeps an image as a design of the active workspace: a PNG, JPEG or WebP (told by its bytes), its scale taken from
   * its name (`@2x`) or its width.
   */
  async addDesign(name: unknown, data: unknown): Promise<Shot> {
    if (!(data instanceof Uint8Array)) throw new Error('Invalid image');
    const bytes = Buffer.from(data);
    const info = imageInfo(bytes);
    if (!info || !info.width || !info.height) throw new Error("That isn't a PNG, JPEG or WebP image");
    const fileName = typeof name === 'string' && name.trim() ? name : `${DESIGN_NAME}.${info.ext}`;
    const fields = { kind: 'design', name: fileName, ...info, scale: designScale(fileName, info.width), pageUrl: null, browser: null, viewport: null, area: null, group: null } as const;
    const shot = await this.deps.store.add({ ...fields, bytes, thumb: makeThumbnail(bytes) });
    this.changed();
    return shot;
  }

  /** Captures the whole page laid out at a design's width and scale, to compare the two. */
  async captureForDesign(designId: unknown): Promise<Shot> {
    const design = this.deps.store.get(designId);
    const { page } = this.deps;
    return this.captureApp({ area: 'page' }, (capture) => atWidth(page.cdp, Math.round(design.width / design.scale), design.scale, capture));
  }

  async setScale(id: unknown, scale: unknown): Promise<Shot> {
    const shot = await this.deps.store.setScale(id, scale);
    this.changed();
    return shot;
  }

  async rename(id: unknown, name: unknown): Promise<Shot> {
    const shot = await this.deps.store.rename(id, name);
    this.changed();
    return shot;
  }

  async remove(id: unknown): Promise<void> {
    await this.deps.store.remove(id);
    this.changed();
  }

  /** Announces the active workspace's shots (after a change, or a workspace switch). */
  changed(): void {
    this.deps.send({ type: 'shots-changed', shots: this.deps.store.list() });
  }

  /** Captures the app's page once it is on screen, through `around` (a width to lay it out at) when given. */
  private async captureApp(target: CaptureTarget, around?: (capture: () => Promise<CapturedImage>) => Promise<CapturedImage>): Promise<Shot> {
    const { page } = this.deps;
    const { url } = page.state();
    if (!url) throw new Error('Open a page first');
    await waitUntilShown(page.view);
    const capture = () => captureOverCdp(page.cdp, target);
    const image = await (around ? around(capture) : capture());
    return this.keep(image, url, target.area, { ...APP_BROWSER, version: process.versions.chrome });
  }
}
