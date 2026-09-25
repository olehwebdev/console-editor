import type { CdpTransport } from '../engine/cdp';
import type { PageInterception } from '../engine/PageInterception';
import { NetworkLog } from '../network';
import { FrameServices } from './FrameServices';
import { interceptPage, type PageSources } from './interceptPage';

/** What listens to the page's CDP transport. */
export interface PageListeners {
  /** The console and the inspector, handed each frame session. */
  frames: FrameServices;
  network: NetworkLog;
  engine: PageInterception;
}

/**
 * The frames' services (console and inspector), the network log and interception, on one page's
 * transport: interception hands each frame session to the frames' services, tells the log which
 * requests an override answered, and has the log's held requests keep what breakpoints stop.
 */
export function wirePage(transport: CdpTransport, sources: Omit<PageSources, 'network'>): PageListeners {
  const frames = new FrameServices(() => sources.settings.get(), sources.send);
  const network = new NetworkLog({ transport, send: sources.send });
  const engine = interceptPage(transport, frames, { ...sources, network });
  return { frames, network, engine };
}
