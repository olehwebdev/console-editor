import type { Debugger } from 'electron';
import type { CdpTransport } from './engine/cdp';

/** Adapts Electron's `webContents.debugger` to the engine's {@link CdpTransport}. */
export function electronTransport(dbg: Debugger): CdpTransport & { dispose(): void } {
  const handlers = new Map<string, Set<(params: unknown) => void>>();

  const onMessage = (_event: unknown, method: string, params: unknown, sessionId?: string) => {
    // Events from auto-attached child targets (workers, OOPIFs) carry a sessionId;
    // the MVP only handles the page's own target.
    if (sessionId) return;
    for (const handler of handlers.get(method) ?? []) handler(params);
  };
  dbg.on('message', onMessage);

  return {
    send: (method, params) => dbg.sendCommand(method, params),
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
