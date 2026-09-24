import type { CdpTransport } from '../cdp';
import type { SessionObserver } from './types';

/** Hands a session to the observer; what it adds is optional, so its failures are dropped. */
export async function observeSession(sessions: SessionObserver | undefined, id: string | undefined, transport: CdpTransport): Promise<void> {
  await sessions?.attached(id, transport).catch(() => undefined);
}
