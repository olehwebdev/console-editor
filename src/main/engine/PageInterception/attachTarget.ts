import { attachIframe } from './attachIframe';
import { attachWorker } from './attachWorker';
import { resumeTarget } from './resumeTarget';
import type { AttachedToTarget, ChildContext, ChildType } from './types';

/** How each kind of auto-attached (or discovered) target is taken on: a new kind fails typecheck until it's here. */
const ATTACH: Record<ChildType, (ctx: ChildContext, p: AttachedToTarget, parentSessionId: string | undefined) => Promise<void>> = {
  iframe: attachIframe,
  worker: attachWorker,
  shared_worker: attachWorker,
  service_worker: attachWorker,
  worklet: attachWorker,
};

/** A target was attached, paused: an iframe or a worker gets an engine of its own; anything else just runs. */
export function attachTarget(ctx: ChildContext, p: AttachedToTarget, parentSessionId: string | undefined): Promise<void> {
  const type = p.targetInfo.type;
  return Object.hasOwn(ATTACH, type) ? ATTACH[type as ChildType](ctx, p, parentSessionId) : resumeTarget(ctx.cdp, p.sessionId);
}
