import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { HOOKS_SOURCE } from '../../src/main/inspector/hooksSource';
import { MAX_ACTION_BATCH, MAX_STACK_FRAMES, STORE_HOOK_GLOBAL, STORES_BINDING } from '../../src/main/inspector/stores/constants';
import { toStoreActions } from '../../src/main/inspector/stores/toStoreActions';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type StoreAction } from '../../src/shared/types';
type Handler = (params: any, sessionId?: string) => void;
type Call = { method: string; params?: Record<string, any>; sessionId?: string };

/** A flattened CDP transport: sessions told apart by id (undefined = the page). */
class FakeCdp implements CdpTransport {
  calls: Call[] = [];
  handlers = new Map<string, Set<Handler>>();
  /** Replies by method; a function gets the params and the session. */
  replies = new Map<string, unknown>();

  async send<T>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T> {
    this.calls.push({ method, params, sessionId });
    const reply = this.replies.get(method) ?? {};
    return (typeof reply === 'function' ? reply(params ?? {}, sessionId) : reply) as T;
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, params: unknown, sessionId?: string): void {
    for (const h of [...(this.handlers.get(event) ?? [])]) h(params, sessionId);
  }

  session(sessionId?: string): CdpTransport {
    return {
      send: (method, params) => this.send(method, params, sessionId),
      on: (event, handler) => this.on(event, (params, sid) => sid === sessionId && handler(params)),
    };
  }

  sent(method: string): Call[] {
    return this.calls.filter((c) => c.method === method);
  }
}

/** The console's view of the page: its top frame, whose main world is context 1. */
const TOP = { frameTree: { frame: { id: 'top', url: 'https://site.test/' } } };
const MAIN_WORLD = { context: { id: 1, origin: '', name: '', uniqueId: 'u-top-1', auxData: { frameId: 'top', isDefault: true } } };
const APP_JS = 'https://site.test/app.js';

/** An action as the store stand-in sends it. */
const pageAction = (over: Record<string, unknown> = {}) => ({
  at: 1000,
  store: 'Redux',
  library: 'redux',
  type: 'cart/added',
  payload: '"A1"',
  changes: [{ path: 'cart.count', from: '0', to: '1' }],
  duration: 0.4,
  stack: [{ name: 'handleAdd', url: APP_JS, line: 0, column: 120 }],
  ...over,
});

describe('recording store actions (main)', () => {
  let cdp: FakeCdp;
  let events: AppEvent[];
  let services: FrameServices;
  const of = <T extends AppEvent['type']>(type: T) => events.filter((e): e is Extract<AppEvent, { type: T }> => e.type === type);
  const recorded = (): StoreAction[] => of('stores-recorded').flatMap((e) => e.actions);
  const attach = async (sessionId?: string) => services.attached(sessionId, cdp.session(sessionId));
  const binding = (payload: string, name = STORES_BINDING) => cdp.emit('Runtime.bindingCalled', { name, payload, executionContextId: 1 });

  beforeEach(async () => {
    cdp = new FakeCdp();
    events = [];
    services = new FrameServices(() => DEFAULT_SETTINGS, (e) => events.push(e));
    cdp.replies.set('Page.getFrameTree', TOP);
    cdp.replies.set('Page.addScriptToEvaluateOnNewDocument', { identifier: 'hooks' });
    await attach();
    cdp.emit('Runtime.executionContextCreated', MAIN_WORLD);
  });

  it('puts the store stand-in in every new document with the React one, in one script', () => {
    const [install] = cdp.sent('Page.addScriptToEvaluateOnNewDocument');
    expect(install!.params).toEqual({ source: HOOKS_SOURCE });
    expect(HOOKS_SOURCE).toContain('__REDUX_DEVTOOLS_EXTENSION_COMPOSE__');
    expect(HOOKS_SOURCE).toContain('__REACT_DEVTOOLS_GLOBAL_HOOK__');
    // The script is valid JavaScript.
    expect(() => new Function(HOOKS_SOURCE)).not.toThrow();
  });

  it("puts the binding in every session while recording, asks each frame's document to find its Vue stores, and takes it out when it stops", async () => {
    await attach('child');
    await services.inspector.recordStores(true);
    expect(cdp.sent('Runtime.addBinding').map((c) => [c.sessionId, c.params?.name])).toEqual([
      [undefined, STORES_BINDING],
      ['child', STORES_BINDING],
    ]);
    expect(of('stores-recording')).toEqual([{ type: 'stores-recording', recording: true }]);
    expect(cdp.sent('Runtime.evaluate').at(-1)?.params).toMatchObject({ expression: `window.${STORE_HOOK_GLOBAL} && window.${STORE_HOOK_GLOBAL}.attach()`, uniqueContextId: 'u-top-1', silent: true });
    expect(services.inspector.recordingStores).toBe(true);
    // Renders go on on their own.
    expect(services.inspector.recordingRenders).toBe(false);

    await services.inspector.recordStores(false);
    expect(cdp.sent('Runtime.removeBinding').map((c) => [c.sessionId, c.params?.name])).toEqual([
      [undefined, STORES_BINDING],
      ['child', STORES_BINDING],
    ]);
    expect(cdp.sent('Runtime.evaluate').at(-1)?.params).toMatchObject({ expression: `delete window.${STORES_BINDING}`, uniqueContextId: 'u-top-1' });
    expect(of('stores-recording').at(-1)).toEqual({ type: 'stores-recording', recording: false });
  });

  it('sends each batch in order, checked and numbered, with its frame; nothing from another binding or once it stopped', async () => {
    await services.inspector.recordStores(true);
    binding(JSON.stringify([pageAction(), pageAction({ at: 2000, type: 'cart/removed' })]));
    binding(JSON.stringify([pageAction()]), 'somethingElse');
    binding('not json');
    await vi.waitFor(() => expect(recorded()).toHaveLength(2));
    expect(recorded()[0]).toEqual({ id: 1, frameId: 'top', ...pageAction() });
    expect(recorded()[1]).toMatchObject({ id: 2, at: 2000, type: 'cart/removed' });
    await services.inspector.recordStores(false);
    binding(JSON.stringify([pageAction()]));
    await new Promise((r) => setTimeout(r, 10));
    expect(recorded()).toHaveLength(2);
  });

  it('checks what the page says of its actions: known libraries only, labels, stacks in loaded files, caps', () => {
    const actions = toStoreActions(
      JSON.stringify([
        pageAction({
          at: 'soon',
          store: 'Re\u0000dux',
          payload: 5,
          duration: -1,
          changes: [{ path: 'cart.count', from: 0, to: '1' }, { path: '' }, 'junk'],
          stack: [
            { name: 'handleAdd', url: APP_JS, line: 3, column: 7 },
            { name: 'eval', url: 'javascript:void 0', line: 0, column: 0 },
            { name: 'half', url: APP_JS, line: -1, column: 2 },
            ...Array.from({ length: MAX_STACK_FRAMES + 5 }, () => ({ name: 'deep', url: APP_JS, line: 1, column: 1 })),
          ],
        }),
        pageAction({ library: 'mobx' }),
        pageAction({ type: '' }),
        ...Array.from({ length: MAX_ACTION_BATCH }, () => pageAction()),
      ]),
    );
    expect(actions[0]).toMatchObject({ store: 'Redux', payload: null, duration: null, changes: [{ path: 'cart.count', from: '', to: '1' }] });
    expect(actions[0]!.at).toBeGreaterThan(0);
    expect(actions[0]!.stack[0]).toEqual({ name: 'handleAdd', url: APP_JS, line: 3, column: 7 });
    // Two calls dropped, and the rest capped before that.
    expect(actions[0]!.stack).toHaveLength(MAX_STACK_FRAMES - 2);
    // The unknown library and the untyped action are dropped after the cap is taken.
    expect(actions).toHaveLength(MAX_ACTION_BATCH - 2);
    expect(toStoreActions('{"not": "a list"}')).toEqual([]);
  });
});
