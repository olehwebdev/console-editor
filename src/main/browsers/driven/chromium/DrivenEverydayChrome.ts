import { CDP } from '../../../engine/constants';
import { START_URL } from '../constants';
import { PAGE_TARGET } from './constants';
import { DrivenChromium } from './DrivenChromium';
import type { DrivenTabState } from './types';

/**
 * Your everyday Chromium browser, remote debugging turned on for it: only the tabs the app opens there are attached and
 * served the workspace's changes. Your own tabs are neither listed nor touched, and letting go of it leaves it as it was.
 */
export class DrivenEverydayChrome extends DrivenChromium {
  override async start(): Promise<void> {
    await this.listen();
  }

  protected override async newTab(): Promise<DrivenTabState> {
    const { targetId } = await this.connection.send<{ targetId: string }>(CDP.Target.createTarget, { url: START_URL });
    const { sessionId } = await this.connection.send<{ sessionId: string }>(CDP.Target.attachToTarget, { targetId, flatten: true });
    // Its interception is set up before anything loads in it (the attach event, if it came first, did the same).
    this.attached({ sessionId, targetInfo: { targetId, type: PAGE_TARGET, url: START_URL, title: '' } });
    return this.tabs.get(targetId);
  }
}
