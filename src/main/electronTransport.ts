import type { Debugger } from 'electron';
import type { CdpTransport } from './engine/cdp';

/** Adapts Electron's `webContents.debugger` to the engine's {@link CdpTransport}. */
export function electronTransport(dbg: Debugger): CdpTransport & { dispose(): void } {
  const handlers = new Map<string, Set<(params: unknown, sessionId?: string) => void>>();

  const onMessage = (_event: unknown, method: string, params: unknown, sessionId?: string) => {
    // The page's own events carry no (or an empty) sessionId; auto-attached
    // iframe targets carry theirs.
    for (const handler of handlers.get(method) ?? []) {
      // A throw out of the debugger's 'message' listener can freeze Electron's main process,
      // and would skip the remaining handlers: each one is on its own.
      try {
        handler(params, sessionId || undefined);
      } catch (err) {
        console.error('CDP event handler failed', method, err);
      }
    }
  };
  dbg.on('message', onMessage);

  return {
    send: (method, params, sessionId) => (sessionId ? dbg.sendCommand(method, params, sessionId) : dbg.sendCommand(method, params)),
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
    dispose() {
      dbg.off('message', onMessage);
      handlers.clear();
    },
  };
}
