import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import type { CdpConnection } from './CdpConnection';

/**
 * Attaches to a page target and returns a transport whose root session is that
 * page. Child sessions (auto-attached iframes) are addressed by their sessionId;
 * their events carry it, while the page's own events carry none.
 */
export async function attachToPage(
  connection: CdpConnection,
  targetId: string,
): Promise<CdpTransport & { readonly sessionId: string; detach(): Promise<void> }> {
  const { sessionId: root } = await connection.send<{ sessionId: string }>(CDP.Target.attachToTarget, { targetId, flatten: true });
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
