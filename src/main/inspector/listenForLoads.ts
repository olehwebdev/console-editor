import type { PageFrame } from '../console/types';
import type { CdpTransport } from '../engine/cdp';
import { CDP, FRAME_SWAP_REASON } from '../engine/constants';
import type { LoadSinks } from './types';

/** Tells `sinks` when a frame of this session finished loading, or lost its document. Returns the unsubscribers. */
export function listenForLoads(transport: CdpTransport, sinks: LoadSinks): Array<() => void> {
  return [
    transport.on(CDP.Page.frameStoppedLoading, (p: { frameId: string }) => sinks.loaded(p.frameId)),
    transport.on(CDP.Page.frameNavigated, (p: { frame: PageFrame }) => sinks.gone(p.frame.id)),
    // A frame that moved to another process is still there: its new session reports it.
    transport.on(CDP.Page.frameDetached, (p: { frameId: string; reason?: string }) => {
      if (p.reason !== FRAME_SWAP_REASON) sinks.gone(p.frameId);
    }),
  ];
}
