/**
 * The minimal Chrome DevTools Protocol surface the engine needs.
 * Adapters exist for Electron's `webContents.debugger` (see `electronTransport`)
 * and for a browser-level WebSocket connection (`websocketTransport`, which
 * drives the integration tests and is the basis for an external-Chrome mode).
 */
export interface CdpTransport {
  /**
   * Sends a command to the page's own session, or to a child session
   * (an auto-attached iframe target) when `sessionId` is given.
   */
  send<T = any>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T>;
  /**
   * Subscribes to a protocol event. Events from the page's own session arrive
   * with `sessionId` undefined; events from child sessions carry their id.
   * Returns an unsubscribe function.
   */
  on(event: string, handler: (params: any, sessionId?: string) => void): () => void;
}

/**
 * A view of `transport` bound to one session: commands go to `sessionId`
 * (undefined = the page's own session) and only that session's events are
 * delivered. Engines are always given one of these, so a request paused on
 * one session can never be continued on another.
 */
export function sessionTransport(transport: CdpTransport, sessionId?: string): CdpTransport {
  // '' and undefined both mean the page's own session.
  const own = sessionId || undefined;
  return {
    send: (method, params) => transport.send(method, params, own),
    on: (event, handler) =>
      transport.on(event, (params, sid) => {
        if ((sid || undefined) === own) handler(params);
      }),
  };
}
