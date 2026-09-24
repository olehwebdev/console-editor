import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { IFRAME_AUTO_ATTACH } from './constants';
import type { ChildTarget, IframeContext } from './types';

/** Sets up an iframe session's engine while the iframe is still paused. */
export async function setUpIframe(ctx: IframeContext, child: ChildTarget, parent: ChildTarget | undefined, transport: CdpTransport): Promise<void> {
  const { engine } = child;
  await engine.attach();
  // Depth counts frames, not sessions: this iframe may sit inside a same-site iframe of its parent.
  const parentEngine = parent?.engine ?? ctx.root;
  if (engine.parentFrameId) engine.setBaseDepth(parentEngine.frameDepth(engine.parentFrameId) + 1);
  // Nested cross-site iframes attach through this session.
  if (ctx.children.isLive(child)) await transport.send(CDP.Target.setAutoAttach, { ...IFRAME_AUTO_ATTACH });
}
