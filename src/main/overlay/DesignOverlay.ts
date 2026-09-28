import type { OverlayState } from '../../shared/types';
import { overlaySettingsSchema } from '../../shared/overlay';
import { parseInput } from '../store/parseInput';
import { DEFAULT_OVERLAY_SETTINGS } from './constants';
import { fitToWidth } from './fitToWidth';
import { PageOverlay } from './PageOverlay';
import type { DesignOverlayDeps } from './types';

/** A patch of the settings: any of them, each checked as a whole setting is. */
const PATCH_SCHEMA = overlaySettingsSchema.partial();

/**
 * The design laid over the app's page: shown in its top frame (after reloads too), styled as set, the page laid out at
 * the design's width while that is on; every change announced (`overlay-changed`) to both windows. It is taken off
 * with its shot, and when the workspace changes.
 */
export class DesignOverlay {
  private state: OverlayState | null = null;
  private readonly overlay: PageOverlay;
  /** The width the page is laid out at and the view's size then ('' at its own width): unchanged, it isn't laid out again. */
  private fitted = '';

  constructor(private readonly deps: DesignOverlayDeps) {
    this.overlay = new PageOverlay(deps.page.cdp);
  }

  get(): OverlayState | null {
    return this.state;
  }

  /** Lays a shot over the page, keeping the settings of the one it replaces. */
  async show(shotId: unknown): Promise<OverlayState> {
    const shot = this.deps.store.get(shotId);
    const bytes = await this.deps.store.read(shotId);
    const state: OverlayState = { shotId: shot.id, name: shot.name, width: Math.round(shot.width / shot.scale), height: Math.round(shot.height / shot.scale), settings: this.state?.settings ?? DEFAULT_OVERLAY_SETTINGS };
    await this.overlay.show(bytes.toString('base64'), state.settings, state.width, state.height);
    this.state = state;
    this.fit();
    this.announce();
    return state;
  }

  async update(patch: unknown): Promise<OverlayState> {
    const current = this.state;
    if (!current) throw new Error('No design is over the page');
    const state = { ...current, settings: { ...current.settings, ...parseInput(PATCH_SCHEMA, patch, 'overlay settings') } };
    this.state = state;
    await this.overlay.restyle(state.settings, state.width, state.height);
    this.fit();
    this.announce();
    return state;
  }

  async remove(): Promise<void> {
    if (!this.state) return;
    this.state = null;
    this.fit();
    this.announce();
    await this.overlay.remove();
  }

  /** A shot was deleted: the overlay goes with it. */
  shotRemoved(id: string): Promise<void> {
    return this.state?.shotId === id ? this.remove() : Promise.resolve();
  }

  /** Lays the page out at the design's width while that is on (again as the view changes size), else at its own. */
  fit(): void {
    const width = this.state?.settings.fitWidth ? this.state.width : null;
    const view = this.deps.page.view.getBounds();
    const fitted = width === null ? '' : `${width}:${view.width}x${view.height}`;
    // Hidden (no size), the page stays as it was laid out; it is again once shown.
    if (fitted === this.fitted || (width !== null && !view.width)) return;
    this.fitted = fitted;
    fitToWidth(this.deps.page.view, width);
  }

  /** Runs `task` (a capture) with the page as it is: the overlay hidden and the page at its own width. */
  async suspended<T>(task: () => Promise<T>): Promise<T> {
    const state = this.state;
    if (!state) return task();
    await this.overlay.restyle({ ...state.settings, hidden: true }, state.width, state.height);
    this.fitted = '';
    fitToWidth(this.deps.page.view, null);
    try {
      return await task();
    } finally {
      if (this.state === state) {
        await this.overlay.restyle(state.settings, state.width, state.height).catch(() => undefined);
        this.fit();
      }
    }
  }

  private announce(): void {
    this.deps.send({ type: 'overlay-changed', overlay: this.state });
  }
}
