import type { CdpTransport } from './cdp';

interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
  method: string;
}

type RawHandler = (method: string, params: unknown, sessionId: string | undefined) => void;

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
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, method });
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
    if (msg.method) for (const h of this.handlers) h(msg.method, msg.params, msg.sessionId);
  }
}

/**
 * Attaches to a page target and returns a transport whose root session is that
 * page. Child sessions (auto-attached iframes) are addressed by their sessionId;
 * their events carry it, while the page's own events carry none.
 */
export async function attachToPage(
  connection: CdpConnection,
  targetId: string,
): Promise<CdpTransport & { readonly sessionId: string; detach(): Promise<void> }> {
  const { sessionId: root } = await connection.send<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true });
  const handlers = new Map<string, Set<(params: any, sessionId?: string) => void>>();
  const off = connection.onEvent((method, params, sessionId) => {
    // Browser-level events (no session) belong to no page.
    if (!sessionId) return;
    for (const h of handlers.get(method) ?? []) h(params, sessionId === root ? undefined : sessionId);
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
      await connection.send('Target.detachFromTarget', { sessionId: root }).catch(() => undefined);
    },
  };
}
