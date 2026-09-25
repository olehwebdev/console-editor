import type { Debugger } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { electronTransport } from '../../src/main/electronTransport';
import { CdpConnection } from '../../src/main/engine/websocketTransport';

type MessageListener = (event: unknown, method: string, params: unknown, sessionId?: string) => void;

/** Captures the listener the transport gives `webContents.debugger`'s 'message' event. */
function fakeDebugger() {
  let listener: MessageListener | undefined;
  const dbg = {
    on: (_event: string, fn: MessageListener) => {
      listener = fn;
    },
    off: () => {
      listener = undefined;
    },
    sendCommand: vi.fn(async () => ({})),
  };
  return { dbg: dbg as unknown as Debugger, message: (method: string, params: unknown, sessionId?: string) => listener!({}, method, params, sessionId) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('electronTransport', () => {
  it("keeps a throwing handler from skipping the next one or escaping the debugger's listener", () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { dbg, message } = fakeDebugger();
    const transport = electronTransport(dbg);
    const seen: unknown[] = [];
    transport.on('Fetch.requestPaused', () => {
      throw new TypeError('boom');
    });
    transport.on('Fetch.requestPaused', (params, sessionId) => seen.push([params, sessionId]));
    expect(() => message('Fetch.requestPaused', { requestId: 'r1' }, '')).not.toThrow();
    expect(seen).toEqual([[{ requestId: 'r1' }, undefined]]);
    expect(error).toHaveBeenCalledWith('CDP event handler failed', 'Fetch.requestPaused', expect.any(TypeError));
  });
});

describe('CdpConnection', () => {
  it('keeps a throwing event handler from skipping the others', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ws = new EventTarget() as unknown as WebSocket;
    // The constructor is private: the connection is normally made by `connect`.
    const connection = new (CdpConnection as unknown as new (ws: WebSocket) => CdpConnection)(ws);
    const seen: string[] = [];
    connection.onEvent(() => {
      throw new Error('boom');
    });
    connection.onEvent((method) => seen.push(method));
    const event = new MessageEvent('message', { data: JSON.stringify({ method: 'Network.responseReceived', params: {} }) });
    expect(() => ws.dispatchEvent(event)).not.toThrow();
    expect(seen).toEqual(['Network.responseReceived']);
    expect(error).toHaveBeenCalledWith('CDP event handler failed', 'Network.responseReceived', expect.any(Error));
  });
});
