import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { ADAPTER_SOURCE, DATA_OF_SOURCE, ELEMENT_OF_SOURCE, FNS_OF_SOURCE } from '../../src/main/inspector/adapter/adapterSource';
import { KEPT_REGISTRY_SOURCE } from '../../src/main/inspector/adapter/registrySource';
import { FRAME_GONE, MAX_RENDERED, NO_ELEMENT, NOT_JSON, NOT_SETTABLE, RENDERED_TYPES, RENDERS_BINDING } from '../../src/main/inspector/constants';
import { toStateEdit } from '../../src/main/inspector/reading/toStateEdit';
import { toRenderCommits } from '../../src/main/inspector/renders/toRenderCommits';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type RenderCommit } from '../../src/shared/types';

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

const APP_JS = 'https://site.test/app.js';
const place = (columnNumber: number) => ({ scriptId: '7', lineNumber: 0, columnNumber });
/** The console's view of the page: its top frame, whose main world is context 1. */
const TOP = { frameTree: { frame: { id: 'top', url: 'https://site.test/' } } };
const MAIN_WORLD = { context: { id: 1, origin: '', name: '', uniqueId: 'u-top-1', auxData: { frameId: 'top', isDefault: true } } };

/** A commit as the hook stand-in sends it. */
const pageCommit = (over: Record<string, unknown> = {}) => ({
  at: 1000,
  duration: null,
  trigger: { type: 'click', target: 'button#add' },
  action: { store: 'Redux', type: 'cart/added' },
  components: [
    { name: 'Sd', key: 'A1', type: 0, kind: 'render', memo: false, duration: 1.5, reasons: [{ kind: 'state', changes: [{ name: '1', from: '1', to: '2' }] }] },
    { name: 'l2', key: null, type: 1, kind: 'skip', memo: true, reasons: [] },
  ],
  more: 0,
  ...over,
});

describe('recording renders, the Components tree and setting state (main)', () => {
  let cdp: FakeCdp;
  let events: AppEvent[];
  let services: FrameServices;
  const of = <T extends AppEvent['type']>(type: T) => events.filter((e): e is Extract<AppEvent, { type: T }> => e.type === type);
  const recorded = (): RenderCommit[] => of('renders-recorded').flatMap((e) => e.commits);
  const attach = async (sessionId?: string) => services.attached(sessionId, cdp.session(sessionId));
  const binding = (payload: string, name = RENDERS_BINDING) => cdp.emit('Runtime.bindingCalled', { name, payload, executionContextId: 1 });

  beforeEach(async () => {
    cdp = new FakeCdp();
    events = [];
    services = new FrameServices(() => ({ ...DEFAULT_SETTINGS, frameworkHooks: false }), (e) => events.push(e));
    cdp.replies.set('Page.getFrameTree', TOP);
    cdp.replies.set('Runtime.evaluate', (p: { expression: string }) => ({ result: { type: 'object', objectId: p.expression.includes(RENDERED_TYPES) ? 'types' : 'answer' } }));
    cdp.replies.set('Runtime.getProperties', (p: { objectId: string }) => {
      if (p.objectId === 'types' || p.objectId === 'fns') return { result: ['0', '1'].map((name) => ({ name, value: { type: 'function', objectId: `fn${name}` } })) };
      const places: Record<string, unknown> = { fn0: place(120), fn1: place(40) };
      return { result: [], internalProperties: places[p.objectId] ? [{ name: '[[FunctionLocation]]', value: { type: 'object', value: places[p.objectId] } }] : [] };
    });
    cdp.replies.set('Debugger.enable', (_: unknown, sessionId?: string) => {
      cdp.emit('Debugger.scriptParsed', { scriptId: '7', url: APP_JS }, sessionId);
      return {};
    });
    await attach();
    cdp.emit('Runtime.executionContextCreated', MAIN_WORLD);
  });

  describe('Renders', () => {
    it('puts the binding in every session while recording, one that attaches too, and takes it and its function out when it stops', async () => {
      await attach('child');
      await services.inspector.recordRenders(true);
      expect(cdp.sent('Runtime.addBinding').map((c) => [c.sessionId, c.params?.name])).toEqual([
        [undefined, RENDERS_BINDING],
        ['child', RENDERS_BINDING],
      ]);
      expect(of('renders-recording')).toEqual([{ type: 'renders-recording', recording: true }]);
      await attach('late');
      expect(cdp.sent('Runtime.addBinding').at(-1)?.sessionId).toBe('late');

      await services.inspector.recordRenders(false);
      expect(cdp.sent('Runtime.removeBinding').map((c) => c.sessionId)).toEqual([undefined, 'child', 'late']);
      // A removed binding's function stays in documents already loaded: it is deleted there.
      expect(cdp.sent('Runtime.evaluate').at(-1)?.params).toMatchObject({ expression: `delete window.${RENDERS_BINDING}`, uniqueContextId: 'u-top-1' });
      expect(services.inspector.recordingRenders).toBe(false);
    });

    it('sends each batch in order, checked, with its frame and its functions located once per document', async () => {
      await services.inspector.recordRenders(true);
      binding(JSON.stringify([pageCommit()]));
      binding(JSON.stringify([pageCommit({ at: 2000, trigger: null })]));
      await vi.waitFor(() => expect(recorded()).toHaveLength(2));
      expect(recorded()[0]).toEqual({
        id: 1,
        frameId: 'top',
        at: 1000,
        duration: null,
        trigger: { type: 'click', target: 'button#add' },
        action: { store: 'Redux', type: 'cart/added' },
        components: [
          { name: 'Sd', key: 'A1', kind: 'render', memo: false, duration: 1.5, reasons: [{ kind: 'state', changes: [{ name: '1', from: '1', to: '2' }] }], location: { url: APP_JS, line: 0, column: 120 } },
          { name: 'l2', key: null, kind: 'skip', memo: true, duration: null, reasons: [], location: { url: APP_JS, line: 0, column: 40 } },
        ],
        more: 0,
      });
      expect(recorded()[1]).toMatchObject({ id: 2, at: 2000, trigger: null });
      const lookups = cdp.sent('Runtime.evaluate').filter((c) => String(c.params?.expression).includes(RENDERED_TYPES));
      expect(lookups).toHaveLength(1);
      expect(lookups[0]!.params).toMatchObject({ expression: `window.__REACT_DEVTOOLS_GLOBAL_HOOK__.${RENDERED_TYPES}([0,1])`, contextId: 1, silent: true });
    });

    it("ignores what isn't a batch, another binding's calls, and anything once it stopped", async () => {
      await services.inspector.recordRenders(true);
      binding('not json');
      binding(JSON.stringify([pageCommit()]), 'somethingElse');
      await services.inspector.recordRenders(false);
      binding(JSON.stringify([pageCommit()]));
      await new Promise((r) => setTimeout(r, 10));
      expect(recorded()).toEqual([]);
    });

    it('checks what the page says of its commits: known kinds and reasons only, labels, caps', () => {
      const [commit] = toRenderCommits(
        JSON.stringify([
          pageCommit({
            at: -5,
            duration: 'slow',
            trigger: { type: 'click\u0000', target: 7 },
            action: { store: 7, type: 'cart/added' },
            components: [
              { name: 'A\u0007pp', key: 5, type: 'x', kind: 'render', memo: 'yes', duration: -1, reasons: [{ kind: 'props', changes: [{ name: 'n', from: 1, to: '2' }] }, { kind: 'magic', changes: [] }] },
              { name: 'Gone', kind: 'exploded' },
              ...Array.from({ length: MAX_RENDERED + 5 }, () => ({ name: 'Row', key: null, type: 2, kind: 'mount', reasons: [] })),
            ],
            more: -1,
          }),
        ]),
      );
      expect(commit).toMatchObject({ duration: null, trigger: { type: 'click', target: null }, action: null, more: 0 });
      expect(commit!.at).toBeGreaterThan(0);
      // A preview that isn't text shows as none.
      expect(commit!.components[0]).toEqual({ name: 'App', key: null, kind: 'render', memo: false, duration: null, reasons: [{ kind: 'props', changes: [{ name: 'n', from: '', to: '2' }] }], type: -1 });
      // The unknown kind is dropped after the cap is taken: MAX_RENDERED items, one of them the dropped one.
      expect(commit!.components).toHaveLength(MAX_RENDERED - 1);
      expect(toRenderCommits('{"not": "a list"}')).toEqual([]);
    });
  });

  describe('the Components tree', () => {
    beforeEach(() => {
      cdp.replies.set('Runtime.callFunctionOn', (p: { functionDeclaration: string; objectId: string; arguments?: Array<{ value: unknown }> }) => {
        if (p.functionDeclaration === DATA_OF_SOURCE)
          return { result: { type: 'object', value: { nodes: [{ framework: 'react', name: 'App', key: null, fn: 0, children: 2 }, { framework: 'svelte', name: 'X', fn: 1, children: 0 }], more: 3 } } };
        if (p.functionDeclaration === FNS_OF_SOURCE) return { result: { type: 'object', objectId: 'fns' } };
        if (p.functionDeclaration === ELEMENT_OF_SOURCE) return { result: { type: 'object', objectId: 'el-9' } };
        // Not a production Angular page: no registry needed.
        if (p.functionDeclaration === KEPT_REGISTRY_SOURCE) return { result: { type: 'undefined' } };
        if (p.functionDeclaration.includes('this.depth')) return { result: { type: 'number', value: 1 } };
        return { result: { type: 'object', objectId: 'holder' } };
      });
      cdp.replies.set('DOM.describeNode', { node: { backendNodeId: 9 } });
      cdp.replies.set('DOM.pushNodesByBackendIdsToFrontend', { nodeIds: [1009] });
    });

    it("reads a level in the frame's main world, a node's children counted and its function placed, what the page says checked", async () => {
      const level = await services.inspector.componentTree('top', [0]);
      // The frame's document, in its main world, is what the adapter runs on.
      expect(cdp.sent('Runtime.evaluate')[0]!.params).toMatchObject({ expression: 'document', uniqueContextId: 'u-top-1', silent: true });
      const adapter = cdp.sent('Runtime.callFunctionOn').find((c) => c.params?.functionDeclaration === ADAPTER_SOURCE)!;
      expect(adapter.params).toMatchObject({ objectId: 'answer', arguments: [{ value: 'tree' }, { value: [0] }, { value: null }, { value: null }], silent: true });
      expect(level).toEqual({ frameId: 'top', path: [0], nodes: [{ framework: 'react', name: 'App', key: null, location: { url: APP_JS, line: 0, column: 120 }, children: 2 }], more: 3 });
      expect(cdp.sent('Runtime.releaseObjectGroup').at(-1)?.params?.objectGroup).toMatch(/^inspector-tree-/);
    });

    it("opens a node as a pick of its first element, at its component's depth, and highlights it", async () => {
      const component = await services.inspector.openTreeNode('top', [0, 1]);
      expect(cdp.sent('Runtime.callFunctionOn').find((c) => c.params?.functionDeclaration === ADAPTER_SOURCE)?.params?.arguments).toEqual([{ value: 'locate' }, { value: [0, 1] }, { value: null }, { value: null }]);
      expect(cdp.sent('DOM.setInspectedNode')[0]!.params).toEqual({ nodeId: 1009 });
      expect(cdp.sent('Runtime.callFunctionOn').filter((c) => c.params?.functionDeclaration === ADAPTER_SOURCE).at(-1)?.params).toMatchObject({ objectId: 'el-9', arguments: [{ value: 'describe' }, { value: 1 }, { value: null }, { value: null }] });
      expect(component.frameId).toBe('top');

      await services.inspector.highlightTreeNode('top', [0, 1]);
      expect(cdp.sent('Overlay.highlightNode').at(-1)?.params).toMatchObject({ objectId: 'el-9' });
      await services.inspector.highlightTreeNode('top', null);
      expect(cdp.sent('Overlay.hideHighlight')).toHaveLength(1);
    });

    it("says so when a node has no element, or the frame or path isn't one", async () => {
      cdp.replies.set('Runtime.evaluate', { result: { type: 'object', subtype: 'null', value: null } });
      await expect(services.inspector.openTreeNode('top', [4])).rejects.toThrow(NO_ELEMENT);
      await expect(services.inspector.componentTree('elsewhere', [])).rejects.toThrow(FRAME_GONE);
      await expect(services.inspector.componentTree('top', [-1])).rejects.toThrow(FRAME_GONE);
      await expect(services.inspector.componentTree('top', 'x')).rejects.toThrow(FRAME_GONE);
    });
  });

  it("takes a state edit only as a known kind, a name and JSON", () => {
    expect(toStateEdit({ kind: 'state', name: '1', json: '{"a": [1, true]}' })).toEqual({ kind: 'state', name: '1', value: { a: [1, true] } });
    expect(() => toStateEdit({ kind: 'state', name: '1', json: 'five' })).toThrow(NOT_JSON);
    expect(() => toStateEdit({ kind: 'state', name: '1', json: 5 })).toThrow(NOT_JSON);
    expect(() => toStateEdit({ kind: 'magic', name: '1', json: '5' })).toThrow(NOT_SETTABLE);
    expect(() => toStateEdit({ kind: 'state', name: '', json: '5' })).toThrow(NOT_SETTABLE);
    expect(() => toStateEdit(null)).toThrow(NOT_SETTABLE);
  });
});
