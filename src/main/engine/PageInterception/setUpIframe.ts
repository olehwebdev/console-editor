import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { AUTO_ATTACH } from './constants';
import type { ChildTarget, ChildContext } from './types';

/** Sets up an iframe session's engine while the iframe is still paused. */
export async function setUpIframe(ctx: ChildContext, child: ChildTarget, parent: ChildTarget | undefined, transport: CdpTransport): Promise<void> {
  const { engine } = child;
  await engine.attach();
  engine.placeIn(parent?.engine ?? ctx.root);
  // Nested cross-site iframes, and this iframe's workers, attach through this session.
  if (ctx.children.isLive(child)) await transport.send(CDP.Target.setAutoAttach, { ...AUTO_ATTACH });
}
