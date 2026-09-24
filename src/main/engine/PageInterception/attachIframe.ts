import { sessionTransport } from '../cdp';
import { InterceptionEngine } from '../InterceptionEngine';
import { abortableTransport } from './abortableTransport';
import { IFRAME_SETUP_TIMEOUT_MS, IFRAME_TARGET_TYPE } from './constants';
import { observeSession } from './observeSession';
import { resumeTarget } from './resumeTarget';
import { SessionGoneError } from './SessionGoneError';
import { setUpIframe } from './setUpIframe';
import type { AttachedToTarget, ChildTarget, IframeContext } from './types';
import { withTimeout } from './withTimeout';

/**
 * A target was auto-attached, paused: an iframe of a known session gets an
 * engine of its own, set up before the iframe runs; anything else just runs.
 */
export async function attachIframe(ctx: IframeContext, p: AttachedToTarget, parentSessionId: string | undefined): Promise<void> {
  const { cdp, opts, children } = ctx;
  const { sessionId, targetInfo } = p;
  if (children.has(sessionId)) return;
  const parent = parentSessionId === undefined ? undefined : children.get(parentSessionId);
  const parentKnown = parentSessionId === undefined || !!parent;
  if (ctx.stopped() || targetInfo.type !== IFRAME_TARGET_TYPE || !parentKnown) {
    await resumeTarget(cdp, sessionId);
    return;
  }

  // Registered synchronously, so a detach or fan-out racing the setup finds it.
  const { transport, gone } = abortableTransport(sessionTransport(cdp, sessionId));
  const depth = (parent?.depth ?? 0) + 1;
  const engine = new InterceptionEngine({ ...opts, transport, iframe: { id: sessionId, depth } });
  const child: ChildTarget = { sessionId, targetId: targetInfo.targetId, parentSessionId, depth, engine, gone };
  children.add(child);

  // The observer sets up alongside the engine, within the same time budget.
  const deadline = Date.now() + IFRAME_SETUP_TIMEOUT_MS;
  const observed = observeSession(opts.sessions, sessionId, transport);
  try {
    await withTimeout(setUpIframe(ctx, child, parent, transport), IFRAME_SETUP_TIMEOUT_MS, 'Setting up the iframe');
  } catch (err) {
    if (children.isLive(child) && !(err instanceof SessionGoneError)) {
      opts.emit({
        type: 'error',
        message: `Overrides may not apply inside iframe ${targetInfo.url || targetInfo.targetId}: ${(err as Error).message}`,
      });
    }
  } finally {
    await withTimeout(observed, Math.max(0, deadline - Date.now()), 'Setting up the iframe').catch(() => undefined);
    // Always let the iframe run: a frame left paused would hang the page.
    // (A session that is already gone just answers with an error.)
    await resumeTarget(cdp, sessionId);
  }
}
