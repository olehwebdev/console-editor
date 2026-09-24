import type { WebContents } from 'electron';
import { electronTransport } from '../electronTransport';
import type { CdpTransport } from '../engine/cdp';

/** The DevTools protocol version the engine speaks to the view's debugger. */
const CDP_VERSION = '1.3';

/** Attaches to the page's debugger, for the engine to speak through; `detached` runs if it lets go. */
export function attachDebugger(wc: WebContents, detached: (reason: string) => void): CdpTransport {
  wc.debugger.attach(CDP_VERSION);
  const transport = electronTransport(wc.debugger);
  wc.debugger.on('detach', (_event, reason) => detached(reason));
  return transport;
}
