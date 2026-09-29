import { CDP } from '../constants';
import type { CdpConnection } from './CdpConnection';
import type { PageTransport } from './types';

/**
 * A transport whose root session is a page's, already attached (`root`): the page's own events carry no session id,
 * its child sessions' (auto-attached iframes and workers) carry theirs, and other pages on the connection are never
 * forwarded. `detach` detaches the page's session.
 */
export function pageTransport(connection: CdpConnection, root: string): PageTransport {
  const handlers = new Map<string, Set<(params: any, sessionId?: string) => void>>();
  // Sessions of this page: its own plus iframe sessions auto-attached below it.
  // Other pages on the same connection are never forwarded.
  const parentOf = new Map<string, string>([[root, '']]);
  const forget = (sessionId: string) => {
    parentOf.delete(sessionId);
    for (const [child, parent] of [...parentOf]) if (parent === sessionId) forget(child);
  };
  const off = connection.onEvent((method, params, sessionId) => {
    if (!sessionId || !parentOf.has(sessionId)) return;
    const p = params as { sessionId?: string };
    if (method === CDP.Target.attachedToTarget && p.sessionId) parentOf.set(p.sessionId, sessionId);
    for (const h of handlers.get(method) ?? []) {
      // Each handler on its own: one that throws must not skip the others (or the session bookkeeping below).
      try {
        h(params, sessionId === root ? undefined : sessionId);
      } catch (err) {
        console.error('CDP event handler failed', method, err);
      }
    }
    if (method === CDP.Target.detachedFromTarget && p.sessionId) forget(p.sessionId);
  });
  return {
    sessionId: root,
    send: (method, params, sessionId) => connection.send(method, params, sessionId ?? root),
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
    async detach() {
      off();
      handlers.clear();
      await connection.send(CDP.Target.detachFromTarget, { sessionId: root }).catch(() => undefined);
    },
  };
}
