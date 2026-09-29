import { CDP } from '../../../engine/constants';
import type { CdpConnection } from '../../../engine/websocketTransport';

/** Lets a target that isn't a tab go on as it came: run, and no longer attached. */
export function letTargetGo(connection: CdpConnection, sessionId: string): void {
  connection.send(CDP.Runtime.runIfWaitingForDebugger, {}, sessionId).catch(() => undefined);
  connection.send(CDP.Target.detachFromTarget, { sessionId }).catch(() => undefined);
}
