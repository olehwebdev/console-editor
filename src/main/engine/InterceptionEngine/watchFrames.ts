import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import type { FrameTracker } from './FrameTracker';
import type { NavigationTracker } from './NavigationTracker';
import type { NavigatedFrame, RequestWillBeSentParams } from './types';

/**
 * Follows a page or iframe session's frames and root navigations; `committed`
 * runs when its root frame commits a new document. Returns the unsubscribers.
 */
export function watchFrames(cdp: CdpTransport, frames: FrameTracker, navigation: NavigationTracker, committed: (frame: NavigatedFrame) => void): Array<() => void> {
  return [
    cdp.on(CDP.Network.requestWillBeSent, (p: RequestWillBeSentParams) => navigation.requested(p)),
    cdp.on(CDP.Page.frameNavigated, (p: { frame: NavigatedFrame }) => {
      if (frames.navigated(p.frame)) committed(p.frame);
    }),
    cdp.on(CDP.Page.frameStoppedLoading, (p: { frameId: string }) => navigation.stopped(p.frameId)),
    cdp.on(CDP.Page.frameAttached, (p) => frames.attached(p)),
    cdp.on(CDP.Page.frameDetached, (p) => frames.detached(p)),
  ];
}
