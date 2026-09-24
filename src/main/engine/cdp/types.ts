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
