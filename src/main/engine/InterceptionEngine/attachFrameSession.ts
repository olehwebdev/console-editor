import { CDP } from '../constants';
import { commitNavigation } from './commitNavigation';
import { NETWORK_BUFFERS } from './constants';
import type { FrameSessionContext, FrameTree } from './types';
import { watchFrames } from './watchFrames';

/** Sets up a page or iframe session: its frames, then the Network domain and the settings. */
export async function attachFrameSession(ctx: FrameSessionContext): Promise<void> {
  const { cdp, frames, navigation, disposers } = ctx;
  disposers.push(...watchFrames(cdp, frames, navigation, (frame) => commitNavigation(ctx, frame)));
  await cdp.send(CDP.Page.enable);
  const tree = await cdp.send<{ frameTree: FrameTree }>(CDP.Page.getFrameTree);
  frames.seed(tree.frameTree);
  await cdp.send(CDP.Network.enable, NETWORK_BUFFERS);
  await ctx.applySettings();
}
