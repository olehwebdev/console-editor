/**
 * The minimal Chrome DevTools Protocol surface the engine needs.
 * Adapters exist for Electron's `webContents.debugger` (see `electronTransport`)
 * and Playwright's `CDPSession` (used by the integration tests); an adapter for
 * an external Chrome over WebSocket would implement the same two methods.
 */
export interface CdpTransport {
  send<T = any>(method: string, params?: Record<string, unknown>): Promise<T>;
  /** Subscribes to a protocol event. Returns an unsubscribe function. */
  on(event: string, handler: (params: any) => void): () => void;
}
