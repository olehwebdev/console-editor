import type { ResourceContent, ResourceEntry } from '../../../shared/types';
import { sessionTransport, type CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { InterceptionEngine } from '../InterceptionEngine';
import { attachIframe } from './attachIframe';
import { ChildSessions } from './ChildSessions';
import { IFRAME_AUTO_ATTACH, IFRAME_SETUP_TIMEOUT_MS } from './constants';
import { fanOut } from './fanOut';
import { observeSession } from './observeSession';
import type { AttachedToTarget, IframeContext, PageInterceptionOptions, TargetSummary } from './types';
import { withTimeout } from './withTimeout';

/**
 * Interception for one page and all of its cross-site iframes: one
 * {@link InterceptionEngine} per CDP session (the page's own, plus one per
 * iframe session, recursively), each bound to its session, so a request paused
 * on one session is always answered on that same session. Presents the same
 * surface as a single engine.
 */
export class PageInterception {
  private readonly root: InterceptionEngine;
  /** Live iframe sessions by session id, in attach order. */
  private readonly children: ChildSessions;
  private readonly iframes: IframeContext;
  private readonly disposers: Array<() => void> = [];
  private detached = false;

  constructor(private readonly opts: PageInterceptionOptions) {
    this.root = new InterceptionEngine({ ...opts, transport: sessionTransport(opts.transport) });
    this.children = new ChildSessions(opts);
    this.iframes = { cdp: opts.transport, opts, root: this.root, children: this.children, stopped: () => this.detached };
  }

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  async attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on(CDP.Target.attachedToTarget, (p: AttachedToTarget, parentSessionId) => void attachIframe(this.iframes, p, parentSessionId)),
      this.cdp.on(CDP.Target.detachedFromTarget, (p: { sessionId: string }) => this.children.remove(p.sessionId)),
    );
    await this.root.attach();
    if (this.detached) return;
    // Bounded like an iframe's setup: the page loads nothing until this returns.
    await withTimeout(observeSession(this.opts.sessions, undefined, sessionTransport(this.cdp)), IFRAME_SETUP_TIMEOUT_MS, 'Setting up the page').catch(() => undefined);
    await this.cdp.send(CDP.Target.setAutoAttach, { ...IFRAME_AUTO_ATTACH });
  }

  /**
   * Stops intercepting. Iframe sessions get `Fetch.disable` first: it is the
   * only thing that releases a paused iframe navigation.
   */
  detach(): void {
    this.detached = true;
    for (const dispose of this.disposers.splice(0)) dispose();
    this.children.removeAll();
    this.root.detach();
    this.opts.sessions?.detached(undefined);
    this.cdp.send(CDP.Target.setAutoAttach, { autoAttach: false, waitForDebuggerOnStart: false, flatten: true }).catch(() => undefined);
  }

  /** Applies settings on the page and every live iframe session. */
  async applySettings(): Promise<void> {
    await fanOut(this.root, this.children, (engine) => engine.applySettings());
  }

  /** Recomputes interception patterns on the page and every live iframe session. */
  async refreshInterception(): Promise<void> {
    await fanOut(this.root, this.children, (engine) => engine.refreshInterception());
  }

  /** Resources of the page and its iframes (entries from cross-site iframes carry `iframeId`). */
  listResources(): ResourceEntry[] {
    return this.engines().flatMap((e) => e.listResources());
  }

  /**
   * Reads a resource through the session that loaded it (the page's first). A
   * cross-site iframe's own document is reported by its parent, but only the
   * iframe's session can return its body.
   */
  async getResourceContent(url: string): Promise<ResourceContent> {
    const owner = this.engines().find((e) => e.hasResource(url)) ?? this.root;
    const tracked = owner.trackedResource(url);
    const frameSession = tracked?.frameId && this.children.list().find((c) => c.targetId === tracked.frameId && c.engine !== owner);
    if (tracked && frameSession) {
      try {
        const content = await withTimeout(frameSession.engine.readNetworkBody(url, tracked.requestId, tracked.mimeType), IFRAME_SETUP_TIMEOUT_MS, 'Reading the iframe document');
        // The parent served (and may have rewritten) this document; it knows the raw upstream hash.
        return { ...content, hash: owner.upstreamHashOf(url) ?? content.hash };
      } catch {
        // Fall through to the owner (and its out-of-page fetch).
      }
    }
    return owner.getResourceContent(url);
  }

  /** Live iframe sessions (for diagnostics and tests). */
  targets(): TargetSummary[] {
    return this.children.targets();
  }

  private engines(): InterceptionEngine[] {
    return [this.root, ...this.children.engines()];
  }
}
