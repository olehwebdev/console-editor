import { CDP } from '../constants';
import type { Pending, RawHandler } from './types';

/**
 * A browser-level Chrome DevTools Protocol connection over WebSocket
 * (`ws://…/devtools/browser/<id>`), using flattened sessions.
 *
 * Used by the tests to drive a real Chromium, and the building block for
 * driving an external Chrome (roadmap M3).
 */
export class CdpConnection {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly handlers = new Set<RawHandler>();

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener('message', (event) => this.onMessage(String(event.data)));
    ws.addEventListener('close', () => {
      for (const p of this.pending.values()) p.reject(new Error(`CDP connection closed during ${p.method}`));
      this.pending.clear();
    });
  }

  static connect(url: string): Promise<CdpConnection> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => resolve(new CdpConnection(ws)), { once: true });
      ws.addEventListener('error', () => reject(new Error(`Could not connect to ${url}`)), { once: true });
    });
  }

  send<T = any>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, method, sessionId });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  onEvent(handler: RawHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close(): void {
    this.ws.close();
  }

  private onMessage(text: string): void {
    const msg = JSON.parse(text) as {
      id?: number;
      method?: string;
      params?: unknown;
      sessionId?: string;
      result?: unknown;
      error?: { message: string };
    };
    if (msg.id !== undefined) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
      else p.resolve(msg.result);
      return;
    }
    if (!msg.method) return;
    if (msg.method === CDP.Target.detachedFromTarget) {
      // Chromium never answers commands that were in flight to a session that went away.
      const gone = (msg.params as { sessionId?: string }).sessionId;
      for (const [id, p] of this.pending) {
        if (gone && p.sessionId === gone) {
          this.pending.delete(id);
          p.reject(new Error(`${p.method}: session detached`));
        }
      }
    }
    for (const h of this.handlers) {
      // One failing handler must neither skip the others nor break the connection's message loop.
      try {
        h(msg.method, msg.params, msg.sessionId);
      } catch (err) {
        console.error('CDP event handler failed', msg.method, err);
      }
    }
  }
}
