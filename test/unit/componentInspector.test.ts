import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { ADAPTER_SOURCE, DATA_OF_SOURCE, FNS_OF_SOURCE, OWNER_DOCUMENT_SOURCE } from '../../src/main/inspector/adapter/adapterSource';
import { HOVER_INTERVAL_MS, MAX_PICKS, PICK_GONE } from '../../src/main/inspector/constants';
import { toInspectedComponent } from '../../src/main/inspector/reading/toInspectedComponent';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type InspectedComponent } from '../../src/shared/types';

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

  sent(method: string, sessionId?: string | null): Call[] {
    return this.calls.filter((c) => c.method === method && (sessionId === null || c.sessionId === sessionId));
  }
}

/** What the adapter answers for a React button in an item of a list. */
const DESCRIBED = {
  framework: 'react',
  build: 'production',
  depth: 0,
  element: { tag: 'button', id: 'add', classes: ['primary'] },
  chain: [
    { name: 'Sd', key: 'A1', fn: 0 },
    { name: 'l2', key: null, fn: 1 },
  ],
  props: [{ name: 'sku', preview: '"A1"', fn: -1 }],
  state: [{ name: '1', kind: 'state', preview: '1', fn: -1 }],
  context: [{ name: 'Context', preview: '{currency: "EUR"}', provider: 'l2', fn: 1 }],
  handlers: [{ name: 'onClick', function: 'e', fn: 2 }],
};
const APP_JS = 'https://site.test/app.js';

describe('component inspector (picking and reading)', () => {
  let cdp: FakeCdp;
  let events: AppEvent[];
  let services: FrameServices;
  const of = <T extends AppEvent['type']>(type: T) => events.filter((e): e is Extract<AppEvent, { type: T }> => e.type === type);

  beforeEach(() => {
    vi.useFakeTimers();
    cdp = new FakeCdp();
    events = [];
    services = new FrameServices(() => ({ ...DEFAULT_SETTINGS, frameworkHooks: false }), (e) => events.push(e));
    cdp.replies.set('Page.getFrameTree', { frameTree: { frame: { id: 'top', url: 'https://site.test/' }, childFrames: [{ frame: { id: 'same-site', parentId: 'top', url: 'https://site.test/nav' } }] } });
    cdp.replies.set('DOM.resolveNode', (p: { backendNodeId?: number; nodeId?: number }) => ({ object: { type: 'object', objectId: p.nodeId ? `hover-${p.nodeId}` : `el-${p.backendNodeId}` } }));
    cdp.replies.set('DOM.pushNodesByBackendIdsToFrontend', (p: { backendNodeIds: number[] }) => ({ nodeIds: p.backendNodeIds.map((id) => id + 1000) }));
    cdp.replies.set('DOM.getFrameOwner', { backendNodeId: 60 });
    cdp.replies.set('DOM.describeNode', (p: { objectId?: string; backendNodeId?: number }) =>
      p.objectId ? { node: { backendNodeId: 50 } } : { node: { backendNodeId: 60, contentDocument: { backendNodeId: 99 } } },
    );
    cdp.replies.set('Runtime.callFunctionOn', (p: { functionDeclaration: string; arguments?: Array<{ value: unknown }>; objectId: string }) => {
      if (p.functionDeclaration === OWNER_DOCUMENT_SOURCE) return { result: { type: 'object', objectId: 'doc' } };
      if (p.functionDeclaration === DATA_OF_SOURCE) return { result: { type: 'object', value: { ...DESCRIBED, depth: 0 } } };
      if (p.functionDeclaration === FNS_OF_SOURCE) return { result: { type: 'object', objectId: 'fns' } };
      if (p.arguments?.[0]?.value === 'summary') return { result: { type: 'object', value: { element: { tag: 'li', id: '', classes: [] }, framework: 'react', chain: [`at-${p.objectId}`] } } };
      return { result: { type: 'object', objectId: 'holder' } };
    });
    cdp.replies.set('Runtime.getProperties', (p: { objectId: string }) => {
      if (p.objectId === 'fns') return { result: ['0', '1', '2', 'length'].map((name) => ({ name, value: name === 'length' ? { type: 'number', value: 3 } : { type: 'function', objectId: `fn${name}` } })) };
      const places: Record<string, unknown> = { fn0: { scriptId: '7', lineNumber: 0, columnNumber: 120 }, fn1: { scriptId: '7', lineNumber: 0, columnNumber: 40 } };
      const place = places[p.objectId];
      return { result: [], internalProperties: place ? [{ name: '[[FunctionLocation]]', value: { type: 'object', value: place } }] : [] };
    });
    cdp.replies.set('Debugger.enable', (_: unknown, sessionId?: string) => {
      // Enabling replays every script already parsed, before the reply.
      cdp.emit('Debugger.scriptParsed', { scriptId: '7', url: APP_JS }, sessionId);
      return {};
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const attach = async (sessionId?: string) => services.attached(sessionId, cdp.session(sessionId));
  const picked = () => of('inspect-picked').at(-1)?.component as InspectedComponent | undefined;

  it('puts every session in inspect mode, one that attaches while picking too, and takes them all out', async () => {
    await attach();
    await services.inspector.startPicking();
    await attach('child');
    for (const sessionId of [undefined, 'child']) {
      expect(cdp.calls.filter((c) => c.sessionId === sessionId && /^(DOM|Overlay)\./.test(c.method)).map((c) => c.method)).toEqual([
        'DOM.enable',
        'Overlay.enable',
        'DOM.getDocument',
        'Overlay.setInspectMode',
      ]);
      expect(cdp.sent('Overlay.setInspectMode', sessionId)[0]!.params).toMatchObject({ mode: 'searchForNode' });
    }
    expect(of('inspect-picking').map((e) => e.picking)).toEqual([true]);

    await services.inspector.togglePicking();
    expect(cdp.sent('Overlay.setInspectMode', null).slice(2).map((c) => [c.sessionId, c.params?.mode])).toEqual([
      [undefined, 'none'],
      ['child', 'none'],
    ]);
    expect(of('inspect-picking').map((e) => e.picking)).toEqual([true, false]);
    expect(of('inspect-hover').at(-1)?.hover).toBeNull();
  });

  it('reads what is under the pointer at most every interval, the latest node winning, and frees its handles', async () => {
    await attach();
    await services.inspector.startPicking();
    cdp.emit('Overlay.nodeHighlightRequested', { nodeId: 1 });
    cdp.emit('Overlay.nodeHighlightRequested', { nodeId: 2 });
    await vi.advanceTimersByTimeAsync(HOVER_INTERVAL_MS);
    expect(of('inspect-hover').map((e) => e.hover?.chain)).toEqual([['at-hover-2']]);
    expect(cdp.sent('DOM.resolveNode', undefined).map((c) => c.params?.nodeId)).toEqual([2]);
    expect(cdp.sent('Runtime.releaseObjectGroup', undefined).map((c) => c.params?.objectGroup)).toEqual(['inspector-hover']);
  });

  it('ignores the pointer when not picking', async () => {
    await attach();
    cdp.emit('Overlay.nodeHighlightRequested', { nodeId: 1 });
    await vi.advanceTimersByTimeAsync(HOVER_INTERVAL_MS);
    expect(of('inspect-hover')).toEqual([]);
  });

  it('on a click, stops picking, keeps the node, makes it $0, and sends its component with each function placed', async () => {
    await attach();
    await services.inspector.startPicking();
    cdp.emit('Overlay.inspectNodeRequested', { backendNodeId: 5 });
    await vi.waitFor(() => expect(picked()).toBeDefined());

    expect(of('inspect-picking').map((e) => e.picking)).toEqual([true, false]);
    expect(cdp.sent('DOM.resolveNode', undefined)[0]!.params).toEqual({ backendNodeId: 5, objectGroup: 'inspector-pick-1' });
    expect(cdp.sent('DOM.setInspectedNode', undefined)[0]!.params).toEqual({ nodeId: 1005 });
    const adapter = cdp.sent('Runtime.callFunctionOn', undefined).find((c) => c.params?.functionDeclaration === ADAPTER_SOURCE)!;
    expect(adapter.params).toMatchObject({ objectId: 'el-5', arguments: [{ value: 'describe' }, { value: 0 }], silent: true });
    const location = (column: number) => ({ url: APP_JS, line: 0, column });
    expect(picked()).toEqual({
      pickId: '1',
      // The node's document is no frame owner's content document: the session's own frame.
      frameId: 'top',
      framework: 'react',
      build: 'production',
      element: { tag: 'button', id: 'add', classes: ['primary'] },
      chain: [
        { name: 'Sd', key: 'A1', location: location(120) },
        { name: 'l2', key: null, location: location(40) },
      ],
      depth: 0,
      props: [{ name: 'sku', preview: '"A1"', location: null }],
      state: [{ name: '1', kind: 'state', preview: '1', location: null, editable: false }],
      context: [{ name: 'Context', preview: '{currency: "EUR"}', provider: 'l2', location: location(40) }],
      // A function V8 gives no place (native, bound) has none.
      handlers: [{ name: 'onClick', function: 'e', location: null }],
      path: null,
    });
    // Script URLs come from turning the debugger on just long enough, pauses skipped.
    expect(cdp.calls.filter((c) => c.method.startsWith('Debugger.')).map((c) => c.method)).toEqual(['Debugger.enable', 'Debugger.setSkipAllPauses', 'Debugger.disable']);
    expect(cdp.sent('Runtime.releaseObjectGroup', undefined).map((c) => c.params?.objectGroup)).toContain('inspector-read-2');
  });

  it("tells a node's frame by the frame owner whose content document holds it", async () => {
    await attach();
    cdp.replies.set('DOM.describeNode', (p: { objectId?: string }) => (p.objectId ? { node: { backendNodeId: 99 } } : { node: { backendNodeId: 60, contentDocument: { backendNodeId: 99 } } }));
    await services.inspector.startPicking();
    cdp.emit('Overlay.inspectNodeRequested', { backendNodeId: 5 });
    await vi.waitFor(() => expect(picked()?.frameId).toBe('same-site'));
    expect(cdp.sent('DOM.getFrameOwner', undefined)[0]!.params).toEqual({ frameId: 'same-site' });
  });

  it("picks on the clicked node's own session, and reads its chain's other components", async () => {
    await attach();
    await attach('child');
    await services.inspector.startPicking();
    cdp.emit('Overlay.inspectNodeRequested', { backendNodeId: 8 }, 'child');
    await vi.waitFor(() => expect(picked()).toBeDefined());
    expect(cdp.sent('DOM.resolveNode', 'child')).toHaveLength(1);
    await services.inspector.inspectComponent(picked()!.pickId, 1);
    const reads = cdp.sent('Runtime.callFunctionOn', 'child').filter((c) => c.params?.functionDeclaration === ADAPTER_SOURCE);
    expect(reads.map((c) => c.params?.arguments?.[1]?.value)).toEqual([0, 1]);
  });

  it('stops when Chromium cancels inspect mode (Esc in the page)', async () => {
    await attach();
    await services.inspector.startPicking();
    cdp.emit('Overlay.inspectModeCanceled', {});
    await vi.waitFor(() => expect(of('inspect-picking').map((e) => e.picking)).toEqual([true, false]));
  });

  it(`keeps the last ${MAX_PICKS} picks, frees an older one's handles, and says an unknown or gone one is gone`, async () => {
    await attach('child');
    for (let n = 0; n <= MAX_PICKS; n++) {
      await services.inspector.startPicking();
      cdp.emit('Overlay.inspectNodeRequested', { backendNodeId: n }, 'child');
      await vi.waitFor(() => expect(of('inspect-picked')).toHaveLength(n + 1));
    }
    expect(cdp.sent('Runtime.releaseObjectGroup', 'child').map((c) => c.params?.objectGroup)).toContain('inspector-pick-1');
    await expect(services.inspector.inspectComponent('1', 0)).rejects.toThrow(PICK_GONE);
    await expect(services.inspector.inspectComponent('nope', 0)).rejects.toThrow(PICK_GONE);
    const last = picked()!.pickId;
    services.detached('child');
    await expect(services.inspector.inspectComponent(last, 0)).rejects.toThrow(PICK_GONE);
  });

  it("highlights a pick's element on its session, and hides every highlight", async () => {
    await attach();
    await services.inspector.startPicking();
    cdp.emit('Overlay.inspectNodeRequested', { backendNodeId: 5 });
    await vi.waitFor(() => expect(picked()).toBeDefined());
    await services.inspector.highlightPick(picked()!.pickId);
    expect(cdp.sent('Overlay.highlightNode', undefined)[0]!.params).toMatchObject({ backendNodeId: 5 });
    await services.inspector.highlightPick(null);
    expect(cdp.sent('Overlay.hideHighlight', undefined)).toHaveLength(1);
  });

  it('says so, and sends nothing picked, when the picked node cannot be read', async () => {
    await attach();
    cdp.replies.set('DOM.resolveNode', { object: { type: 'undefined' } });
    await services.inspector.startPicking();
    cdp.emit('Overlay.inspectNodeRequested', { backendNodeId: 5 });
    await vi.waitFor(() => expect(of('error')).toHaveLength(1));
    expect(of('error')[0]!.message).toContain(PICK_GONE);
    expect(picked()).toBeUndefined();
  });
});

describe('what the page says of a component (toInspectedComponent)', () => {
  it('keeps known frameworks, builds and kinds only, shows text as labels, and caps lists', () => {
    const component = toInspectedComponent(
      {
        framework: 'svelte',
        build: 'staging',
        depth: -1,
        element: { tag: 'div\u0007', id: 42, classes: ['a', 'b', 'c', 'd', 'e'] },
        chain: [{ name: 'x'.repeat(500), key: 7, fn: 99 }, 'junk'],
        props: Array.from({ length: 100 }, (_, i) => ({ name: `p${i}`, preview: '1' })),
        state: [{ name: '1', kind: 'effect', preview: '1' }],
        handlers: null,
      },
      [],
      { pickId: '3', frameId: null },
    );
    expect(component).toMatchObject({ framework: null, build: null, depth: 0, element: { tag: 'div', id: '', classes: ['a', 'b', 'c', 'd'] }, handlers: [], context: [] });
    expect(component.chain).toEqual([{ name: 'x'.repeat(160), key: null, location: null }]);
    expect(component.props).toHaveLength(60);
    expect(component.state[0]!.kind).toBe('other');
  });
});
