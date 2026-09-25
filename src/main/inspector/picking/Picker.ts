import type { SessionKey } from '../../console/ConsoleFrames';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { HIGHLIGHT_CONFIG, HOVER_INTERVAL_MS, INSPECT_MODE } from '../constants';
import type { PickerOptions } from '../types';
import { enterInspectMode } from './enterInspectMode';
import { hideHighlights } from './hideHighlights';
import { readHover } from './readHover';

/**
 * Picking an element: every session in inspect mode at once, so the pointer can
 * go into any frame, cross-site ones included. While it moves, what is under it
 * is read at most every `HOVER_INTERVAL_MS` (the latest node wins); a click ends
 * picking everywhere and hands the node over. Esc in the page cancels it too.
 * Ending it turns the Overlay domain off, which taxes the page's layouts.
 */
export class Picker {
  private picking = false;
  private hover: { transport: CdpTransport; nodeId: number } | null = null;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly opts: PickerOptions) {}

  get active(): boolean {
    return this.picking;
  }

  /** One session's hovers, clicks and cancels. Returns the unsubscribers. */
  listen(id: SessionKey, transport: CdpTransport): Array<() => void> {
    return [
      transport.on(CDP.Overlay.nodeHighlightRequested, (p: { nodeId: number }) => this.hovered(transport, p.nodeId)),
      transport.on(CDP.Overlay.inspectNodeRequested, (p: { backendNodeId: number }) => void this.chosen(id, p.backendNodeId)),
      transport.on(CDP.Overlay.inspectModeCanceled, () => void this.stop()),
    ];
  }

  /** A session that arrives while picking (an iframe loading) picks too. */
  async joined(transport: CdpTransport): Promise<void> {
    if (this.picking) await enterInspectMode(transport).catch(() => undefined);
  }

  async start(): Promise<void> {
    if (this.picking) return;
    this.picking = true;
    this.opts.send({ type: 'inspect-picking', picking: true });
    await Promise.all(this.opts.sessions.all().map(([, session]) => enterInspectMode(session.transport).catch(() => undefined)));
  }

  async stop(): Promise<void> {
    if (!this.picking) return;
    this.picking = false;
    clearTimeout(this.hoverTimer);
    this.hoverTimer = undefined;
    this.hover = null;
    this.opts.send({ type: 'inspect-picking', picking: false });
    this.opts.send({ type: 'inspect-hover', hover: null });
    const off = { mode: INSPECT_MODE.off, highlightConfig: HIGHLIGHT_CONFIG };
    await Promise.all(this.opts.sessions.all().map(([, session]) => session.transport.send(CDP.Overlay.setInspectMode, off).catch(() => undefined)));
    await hideHighlights(this.opts.sessions, false);
  }

  private async chosen(id: SessionKey, backendNodeId: number): Promise<void> {
    if (!this.picking) return;
    await this.stop();
    this.opts.picked(id, backendNodeId);
  }

  private hovered(transport: CdpTransport, nodeId: number): void {
    if (!this.picking) return;
    this.hover = { transport, nodeId };
    this.hoverTimer ??= setTimeout(() => {
      this.hoverTimer = undefined;
      void this.readHover();
    }, HOVER_INTERVAL_MS);
  }

  private async readHover(): Promise<void> {
    const at = this.hover;
    if (!at) return;
    const hover = await readHover(at.transport, at.nodeId);
    // Picking may have ended, or the pointer moved on, while it was read.
    if (this.picking && this.hover === at) this.opts.send({ type: 'inspect-hover', hover });
  }
}
