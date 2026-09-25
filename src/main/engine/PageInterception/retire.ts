import { CDP } from '../constants';
import type { ChildContext, ChildTarget } from './types';

/** Lets an unregistered service worker go, with its files; the reload installs it afresh. */
export function retire({ cdp, serviceWorkers }: ChildContext, child: ChildTarget): void {
  child.retired = true;
  serviceWorkers.retire(child.targetId);
  cdp.send(CDP.Target.detachFromTarget, { sessionId: child.sessionId }).catch(() => undefined);
}
