import { MESSAGE_TYPE } from './constants';
import type { BidiEventHandler } from './types';

/** A WebDriver BiDi message from the browser: a command's result or error, or an event. */
interface Incoming {
  type: string;
  id?: number;
  result?: unknown;
  error?: string;
  message?: string;
  method?: string;
  params?: unknown;
}

/**
 * A WebDriver BiDi session's connection over WebSocket (`ws://…/session`): commands answered by id, events to every
 * handler, and every command in flight failed once it closes. How the app drives Firefox.
 */
export class BidiConnection {
  private lastId = 0;
  private readonly waiting = new Map<number, { settle(message: Incoming): void; method: string }>();
  private readonly listeners = new Set<BidiEventHandler>();
  private readonly closeListeners = new Set<() => void>();

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener('message', (event) => this.receive(JSON.parse(String(event.data)) as Incoming));
    socket.addEventListener('close', () => {
      for (const [, { settle, method }] of this.waiting) settle({ type: MESSAGE_TYPE.error, error: 'closed', message: `The browser went away during ${method}` });
      this.waiting.clear();
      for (const listener of this.closeListeners) listener();
    });
  }

  static open(url: string): Promise<BidiConnection> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.addEventListener('open', () => resolve(new BidiConnection(socket)), { once: true });
      socket.addEventListener('error', () => reject(new Error(`Could not reach ${url}`)), { once: true });
    });
  }

  send<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.lastId;
    return new Promise<T>((resolve, reject) => {
      const settle = (message: Incoming) => (message.type === MESSAGE_TYPE.success ? resolve(message.result as T) : reject(new Error(`${method}: ${message.error}: ${message.message ?? ''}`)));
      this.waiting.set(id, { settle, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  onEvent(handler: BidiEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /** Called once the connection has closed: closed here, or the browser went away. */
  onClose(handler: () => void): () => void {
    this.closeListeners.add(handler);
    return () => this.closeListeners.delete(handler);
  }

  close(): void {
    this.socket.close();
  }

  private receive(message: Incoming): void {
    if (message.type === MESSAGE_TYPE.event && message.method) {
      // A handler that throws must not keep the others from the event.
      for (const listener of this.listeners) {
        try {
          listener(message.method, message.params);
        } catch (err) {
          console.error('BiDi event handler failed', message.method, err);
        }
      }
      return;
    }
    const pending = message.id === undefined ? undefined : this.waiting.get(message.id);
    if (!pending || message.id === undefined) return;
    this.waiting.delete(message.id);
    pending.settle(message);
  }
}
