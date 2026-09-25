/**
 * The Network panel's data (the request log's store, its filter, what a row shows), the JSON schema a
 * response tab gets, and response overrides from the renderer's side: opening a request's response,
 * saving it with its method, operation and answer, and editing those afterwards.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type NetworkRequest, type OverrideMeta } from '../../src/shared/types';
import { MAX_NETWORK_REQUESTS } from '../../src/shared/constants';
import { inferJsonSchema, mergeSchemas } from '@/shared/lib';
import { useTabStore } from '@/entities/editor-tab';
import { requestGroup, requestPath, useNetworkStore } from '@/entities/network-request';
import { findResponseOverride, overrideLabel, useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';
import { applyResponse } from '@/features/edit-response-rule';
import { fromForm, invalidFields, ruleOf, sameResponseRule, setPendingRule, toForm } from '@/features/edit-response-rule/model';
import { matchesNetworkFilter, receiveRequests, useNetworkFilter } from '@/features/network/filter';
import { openResponse } from '@/features/open-resource';
import { saveTab } from '@/features/save-override';
import { comparesWithLive } from '@/widgets/editor-panel/lib/comparesWithLive';
import { opensAsFile, overridable } from '@/widgets/network-panel/lib';
import { formatDuration } from '@/widgets/network-panel/ui/NetworkPanel/formatDuration';
import { formatSize } from '@/widgets/network-panel/ui/NetworkPanel/formatSize';
import { statusCell } from '@/widgets/network-panel/ui/NetworkPanel/statusCell';

const api = vi.hoisted(() => ({
  getNetworkResponseBody: vi.fn(),
  getOverride: vi.fn(),
  createOverride: vi.fn(),
  updateOverride: vi.fn(),
  reload: vi.fn(async () => {}),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn((_options: object) => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));
const setModelSchema = vi.hoisted(() => vi.fn());

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String((err as Error)?.message ?? err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm: async () => true, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', () => {
  class FakeModel {
    uri = { toString: () => `inmemory://tab/${Math.random()}` };
    constructor(private text: string) {}
    getValue = () => this.text;
    getAlternativeVersionId = () => 1;
    onDidChangeContent = () => ({ dispose: () => {} });
    dispose = () => {};
  }
  return {
    monaco: { editor: { createModel: (text: string) => new FakeModel(text) }, Uri: { from: () => ({}) } },
    languageFor: () => 'json',
    setModelSchema,
    editorHasFocus: () => false,
    dismissEditorWidgets: () => {},
    triggerInActiveEditor: () => {},
  };
});

type ToastCall = { title: string; description?: string; tone?: string };
const toasts = () => (toast.mock.calls as unknown as Array<[ToastCall]>).map(([t]) => t);

let seq = 0;
function request(extra: Partial<NetworkRequest> = {}): NetworkRequest {
  const id = extra.id ?? `n${++seq}`;
  return {
    id,
    url: `https://api.test/v1/${id}?page=2`,
    method: 'GET',
    type: 'Fetch',
    state: 'done',
    status: 200,
    mimeType: 'application/json',
    startedAt: seq,
    hasBody: false,
    pageLoad: 1,
    ...extra,
  };
}

function responseOverride(extra: Partial<OverrideMeta> = {}): OverrideMeta {
  return {
    id: extra.id ?? `o${++seq}`,
    kind: 'Fetch',
    sourceUrl: 'https://api.test/graphql',
    match: { type: 'exact', pattern: 'https://api.test/graphql', ignoreQuery: true },
    enabled: true,
    originalHash: null,
    request: { method: 'POST', operation: 'GetCart' },
    response: { status: 200, delayMs: 0, headers: [] },
    createdAt: seq,
    updatedAt: seq,
    ...extra,
  };
}

const setSettings = (extra: Partial<typeof DEFAULT_SETTINGS>) => useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, autoFormatMinified: false, ...extra } });

beforeEach(() => {
  vi.clearAllMocks();
  useNetworkStore.setState({ requests: [] });
  useNetworkFilter.setState({ group: 'fetch', text: '', keepRows: false });
  useTabStore.setState({ tabs: [], pages: [], activeId: null, diff: 'off' });
  useOverrideStore.setState({ byId: {} });
  setSettings({ autoReloadOnSave: false });
});

describe('the request log', () => {
  it('adds new rows at the end and updates known ones in place', () => {
    const a = request({ state: 'pending', status: 0 });
    const b = request();
    receiveRequests([a, b]);
    receiveRequests([{ ...a, state: 'done', status: 201 }]);
    expect(useNetworkStore.getState().requests.map((r) => [r.id, r.status])).toEqual([
      [a.id, 201],
      [b.id, 200],
    ]);
  });

  it('keeps the newest rows up to the limit', () => {
    const rows = Array.from({ length: MAX_NETWORK_REQUESTS + 5 }, () => request());
    receiveRequests(rows);
    const kept = useNetworkStore.getState().requests;
    expect(kept).toHaveLength(MAX_NETWORK_REQUESTS);
    expect(kept.at(-1)!.id).toBe(rows.at(-1)!.id);
    expect(kept[0]!.id).toBe(rows[5]!.id);
  });

  it("drops an earlier page's rows when another page loads, unless Keep rows is on", () => {
    receiveRequests([request({ pageLoad: 1 }), request({ pageLoad: 1 })]);
    receiveRequests([request({ pageLoad: 2 })]);
    expect(useNetworkStore.getState().requests.map((r) => r.pageLoad)).toEqual([2]);

    useNetworkFilter.getState().toggleKeepRows();
    receiveRequests([request({ pageLoad: 3 })]);
    expect(useNetworkStore.getState().requests.map((r) => r.pageLoad)).toEqual([2, 3]);
  });

  it('replaces the rows with a snapshot', () => {
    receiveRequests([request(), request()]);
    const snapshot = [request({ pageLoad: 4 })];
    receiveRequests(snapshot, true);
    expect(useNetworkStore.getState().requests).toEqual(snapshot);
  });
});

describe('filtering and showing rows', () => {
  it('groups requests by their Network type: Fetch/XHR holds what the page’s code asks for', () => {
    expect(['Fetch', 'XHR', 'EventSource', 'Preflight'].map((type) => requestGroup({ type }))).toEqual(['fetch', 'fetch', 'fetch', 'fetch']);
    expect(requestGroup({ type: 'Script' })).toBe('js');
    expect(requestGroup({ type: 'Document' })).toBe('doc');
    expect(requestGroup({ type: 'Ping' })).toBe('other');
    expect(requestGroup({ type: 'toString' })).toBe('other');
  });

  it('shows the group picked, and URLs or GraphQL operations containing the text', () => {
    const cart = request({ url: 'https://api.test/cart' });
    const gql = request({ url: 'https://api.test/graphql', method: 'POST', operation: 'GetUser' });
    const script = request({ url: 'https://cdn.test/app.js', type: 'Script' });
    const shown = (filter: { group: 'all' | 'fetch' | 'js'; text: string }) => [cart, gql, script].filter((r) => matchesNetworkFilter(r, filter)).map((r) => r.url);

    expect(shown({ group: 'fetch', text: '' })).toEqual([cart.url, gql.url]);
    expect(shown({ group: 'all', text: '' })).toHaveLength(3);
    expect(shown({ group: 'js', text: '' })).toEqual([script.url]);
    expect(shown({ group: 'all', text: '  CART ' })).toEqual([cart.url]);
    expect(shown({ group: 'fetch', text: 'getuser' })).toEqual([gql.url]);
  });

  it("names a row by its path and query, or its whole URL when it isn't a web address", () => {
    expect(requestPath('https://api.test/v1/cart?page=2')).toBe('/v1/cart?page=2');
    expect(requestPath('data:application/json,{}')).toBe('data:application/json,{}');
    expect(requestPath('not a url')).toBe('not a url');
  });

  it('shows the status by class, … until a response arrives, and failures in red', () => {
    expect(statusCell({ state: 'pending', status: 0 })).toEqual({ text: '…', className: 'text-fg-subtle' });
    expect(statusCell({ state: 'pending', status: 503 }).className).toBe('text-danger');
    expect(statusCell({ state: 'done', status: 200 }).className).toBe('text-fg-muted');
    expect(statusCell({ state: 'done', status: 304 }).className).toBe('text-info');
    expect(statusCell({ state: 'done', status: 404 }).className).toBe('text-danger');
    expect(statusCell({ state: 'failed', status: 0 })).toEqual({ text: 'failed', className: 'text-danger' });
  });

  it('writes sizes and times the way DevTools does', () => {
    expect(formatSize(undefined)).toBe('');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(2048)).toBe('2.0 kB');
    expect(formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(12.4)).toBe('12 ms');
    expect(formatDuration(1530)).toBe('1.53 s');
  });

  it('offers Override response for a finished text response of the page’s code, Open file for files', () => {
    expect(overridable(request())).toBe(true);
    expect(overridable(request({ mimeType: 'image/png' }))).toBe(false);
    expect(overridable(request({ state: 'pending' }))).toBe(false);
    expect(overridable(request({ type: 'EventSource', mimeType: 'text/event-stream' }))).toBe(false);
    expect(overridable(request({ type: 'Preflight', mimeType: '' }))).toBe(false);
    // The override that answered it opens, whatever the response.
    expect(overridable(request({ state: 'pending', overrideId: 'o1' }))).toBe(true);
    expect(opensAsFile(request({ type: 'Script' }))).toBe(true);
    expect(opensAsFile(request())).toBe(false);
  });
});

describe('the JSON schema of a response', () => {
  it('describes keys and types, with an example of each value', () => {
    expect(inferJsonSchema({ id: 7, name: 'Ada', admin: false, tags: ['a'], manager: null })).toEqual({
      type: 'object',
      properties: {
        id: { type: 'number', examples: [7] },
        name: { type: 'string', examples: ['Ada'] },
        admin: { type: 'boolean', examples: [false] },
        tags: { type: 'array', items: { type: 'string', examples: ['a'] } },
        manager: {},
      },
    });
  });

  it("merges every item of an array: keys from all, no type where they disagree, a null taking the other's", () => {
    const schema = inferJsonSchema([
      { id: 1, note: null, extra: 'x' },
      { id: '2', note: 'hi' },
    ]);
    expect(schema.items?.properties).toEqual({
      id: {},
      note: { type: 'string', examples: ['hi'] },
      extra: { type: 'string', examples: ['x'] },
    });
    expect(mergeSchemas({}, { type: 'number' })).toEqual({ type: 'number' });
    expect(inferJsonSchema([])).toEqual({ type: 'array' });
  });

  it("doesn't offer a long string as an example", () => {
    expect(inferJsonSchema('x'.repeat(500))).toEqual({ type: 'string' });
  });
});

describe('which response override answers a request', () => {
  it('matches the URL, the method (or any) and the GraphQL operation (or any body); enabled ones first', () => {
    const off = responseOverride({ id: 'off', enabled: false });
    const on = responseOverride({ id: 'on' });
    const any = responseOverride({ id: 'any', request: { method: '*', operation: '' } });
    const file = { ...responseOverride({ id: 'file' }), kind: 'Script' as const };
    const find = (req: Pick<NetworkRequest, 'url' | 'method' | 'operation'>, list: OverrideMeta[]) => findResponseOverride(req, list)?.id;

    const getCart = { url: 'https://api.test/graphql', method: 'POST', operation: 'GetCart' };
    expect(find(getCart, [off, on])).toBe('on');
    expect(find(getCart, [off])).toBe('off');
    expect(find({ ...getCart, operation: 'GetUser' }, [on, off])).toBeUndefined();
    expect(find({ ...getCart, method: 'GET' }, [on, any])).toBe('any');
    expect(find(getCart, [file])).toBeUndefined();
  });

  it('names a response tab by its GraphQL operation, else the file name', () => {
    expect(overrideLabel('https://api.test/graphql', { method: 'POST', operation: 'GetCart' })).toBe('GetCart');
    expect(overrideLabel('https://api.test/v1/cart?x=1', { method: 'GET', operation: '' })).toBe('cart');
    expect(overrideLabel('https://api.test/v1/cart')).toBe('cart');
  });

  it('compares only a GET response override with the live one: fetching it again is a GET', () => {
    expect(comparesWithLive(responseOverride({ request: { method: 'GET', operation: '' } }))).toBe(true);
    expect(comparesWithLive(responseOverride())).toBe(false);
    expect(comparesWithLive(responseOverride({ request: { method: '*', operation: '' } }))).toBe(false);
    expect(comparesWithLive({ ...responseOverride(), kind: 'Script', request: undefined })).toBe(true);
  });
});

describe('opening and saving a response', () => {
  it('opens the response in an unsaved tab with its method and operation, and its JSON schema', async () => {
    api.getNetworkResponseBody.mockResolvedValueOnce({ available: true, binary: false, text: '{"items":[1]}' });
    const req = request({ url: 'https://api.test/graphql', method: 'POST', operation: 'GetCart' });
    await openResponse(req);

    const [tab] = useTabStore.getState().tabs;
    expect(tab).toMatchObject({ url: req.url, kind: 'Fetch', originalHash: null, request: { method: 'POST', operation: 'GetCart' }, response: { status: 200, delayMs: 0, headers: [] } });
    expect(useTabStore.getState().activeId).toBe(tab!.id);
    expect(setModelSchema).toHaveBeenCalledExactlyOnceWith(expect.any(String), { type: 'object', properties: { items: { type: 'array', items: { type: 'number', examples: [1] } } } });

    // Opening it again shows that tab.
    await openResponse(req);
    expect(useTabStore.getState().tabs).toHaveLength(1);
    expect(api.getNetworkResponseBody).toHaveBeenCalledTimes(1);
  });

  it('opens the override that answers the request instead', async () => {
    const answering = responseOverride({ id: 'o-cart' });
    useOverrideStore.setState({ byId: { [answering.id]: answering } });
    api.getOverride.mockResolvedValueOnce({ ...answering, content: '{}' });
    await openResponse(request({ url: 'https://api.test/graphql', method: 'POST', operation: 'GetCart' }));
    expect(api.getNetworkResponseBody).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(useTabStore.getState().tabs[0]).toMatchObject({ overrideId: 'o-cart' }));
  });

  it("says why a response can't be opened", async () => {
    api.getNetworkResponseBody.mockResolvedValueOnce({ available: false, gap: 'gone' });
    await openResponse(request());
    expect(useTabStore.getState().tabs).toHaveLength(0);
    expect(toasts()[0]).toMatchObject({ title: "Can't open this response", tone: 'warning' });
  });

  it('creates the override with the tab’s method, operation and answer, which then belong to the override', async () => {
    api.getNetworkResponseBody.mockResolvedValueOnce({ available: true, binary: false, text: '{"ok":true}' });
    await openResponse(request({ url: 'https://api.test/graphql', method: 'POST', operation: 'GetCart' }));
    const tabId = useTabStore.getState().tabs[0]!.id;
    setPendingRule(tabId, { request: { method: 'POST', operation: 'GetCart' }, response: { status: 503, delayMs: 1500, headers: [{ operation: 'set', name: 'Retry-After', value: '5' }] } });

    const created = responseOverride({ id: 'o-new', response: { status: 503, delayMs: 1500, headers: [{ operation: 'set', name: 'Retry-After', value: '5' }] } });
    api.createOverride.mockResolvedValueOnce(created);
    await saveTab(tabId);

    expect(api.createOverride).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        kind: 'Fetch',
        sourceUrl: 'https://api.test/graphql',
        originalHash: null,
        request: { method: 'POST', operation: 'GetCart' },
        response: { status: 503, delayMs: 1500, headers: [{ operation: 'set', name: 'Retry-After', value: '5' }] },
      }),
    );
    const [tab] = useTabStore.getState().tabs;
    expect(tab).toMatchObject({ overrideId: 'o-new' });
    expect(tab!.request).toBeUndefined();
    expect(tab!.response).toBeUndefined();
  });
});

describe("editing a response override's rule", () => {
  it('shows numbers as typed, and turns an empty one into NaN, which only equals itself', () => {
    const rule = ruleOf(responseOverride({ response: { status: 404, delayMs: 250, headers: [{ operation: 'remove', name: 'ETag', value: '' }] } }));
    const form = toForm(rule);
    expect(form).toMatchObject({ method: 'POST', operation: 'GetCart', status: '404', delay: '250', rowKeys: ['saved-0'] });
    expect(sameResponseRule(fromForm(form), rule)).toBe(true);

    const empty = fromForm({ ...form, status: '', operation: ' GetUser ' });
    expect(empty.request.operation).toBe('GetUser');
    expect(Number.isNaN(empty.response.status)).toBe(true);
    expect(sameResponseRule(empty, fromForm({ ...form, status: '', operation: 'GetUser' }))).toBe(true);
    expect(toForm(empty).status).toBe('');
    expect(sameResponseRule(empty, rule)).toBe(false);
  });

  it("gives the defaults to an override that doesn't say", () => {
    expect(ruleOf({})).toEqual({ request: { method: '*', operation: '' }, response: { status: 200, delayMs: 0, headers: [] } });
  });

  it('marks the fields it can’t be saved with, as they are typed', () => {
    const rule = ruleOf(responseOverride());
    expect(invalidFields(rule)).toEqual({ operation: false, status: false, delay: false });
    expect(invalidFields({ request: { method: 'POST', operation: '1bad' }, response: { status: 42, delayMs: 60_001, headers: [] } })).toEqual({ operation: true, status: true, delay: true });
  });

  it('applies a valid rule to the override, and reloads the page when saving does', async () => {
    const override = responseOverride({ id: 'o1' });
    const rule = { request: { method: 'GET', operation: '' }, response: { status: 500, delayMs: 0, headers: [] } };
    api.updateOverride.mockResolvedValueOnce({ ...override, ...rule });
    setSettings({ autoReloadOnSave: true });

    expect(await applyResponse('o1', rule)).toBe(true);
    expect(api.updateOverride).toHaveBeenCalledExactlyOnceWith('o1', rule);
    expect(useOverrideStore.getState().byId.o1).toMatchObject(rule);
    expect(api.reload).toHaveBeenCalledTimes(1);
  });

  it('turns down an invalid rule without asking the main process', async () => {
    expect(await applyResponse('o1', { request: { method: 'get', operation: '' }, response: { status: 200, delayMs: 0, headers: [] } })).toBe(false);
    expect(await applyResponse('o1', { request: { method: 'GET', operation: '' }, response: { status: Number.NaN, delayMs: 0, headers: [] } })).toBe(false);
    expect(api.updateOverride).not.toHaveBeenCalled();
    expect(toasts().map((t) => t.tone)).toEqual(['danger', 'danger']);
  });
});
