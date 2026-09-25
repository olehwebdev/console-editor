import type { NetworkLogContext } from '../types';

/** `Target.detachedFromTarget`: the session went away; its rows stay, as history. */
export function targetDetached({ workers }: NetworkLogContext, p: { sessionId: string }): void {
  workers.delete(p.sessionId);
}
