import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';

/** Lets a target that auto-attach paused run. Its failures are dropped. */
export async function resumeTarget(cdp: CdpTransport, sessionId: string): Promise<void> {
  await cdp.send(CDP.Runtime.runIfWaitingForDebugger, {}, sessionId).catch(() => undefined);
}
