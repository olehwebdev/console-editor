/**
 * Phase 2 of the Network panel from the renderer's side: requests a breakpoint holds (their tabs, Send,
 * Send original, Fail, Save as override, closing, the page giving up), the breakpoints themselves, and
 * Copy as fetch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Breakpoint, HeldRequest, Workspace } from '../../src/shared/types';
import { DEFAULT_SETTINGS } from '../../src/shared/types';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { useHeldStore } from '@/entities/held-request';
import { fetchSnippet } from '@/entities/network-request';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';
import { closeTab } from '@/features/close-tab';
import { addBreakpoint, removeBreakpoint, toggleBreakpoint } from '@/features/network/breakpoints/model';
import { pauseLike } from '@/features/network/breakpoints';
import { failHeldRequest, receiveHeld, saveHeldAsOverride, sendHeld, sendOriginal, useHeldDrafts } from '@/features/network/held';
import { saveTab } from '@/features/save-override';
import { keptTabs } from '@/pages/editor/model/session/keptTabs';
import { saveFileTab } from '@/widgets/editor-panel';

const api = vi.hoisted(() => ({
  resumeHeldRequest: vi.fn(async () => {}),
  createOverride: vi.fn(),
  updateWorkspace: vi.fn(async () => {}),
  getWorkspaces: vi.fn(),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn((_options: object) => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));
const confirm = vi.hoisted(() => vi.fn(async () => true));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String((err as Error)?.message ?? err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm, isConfirmOpen: () => false }));
vi.mock('@/features/save-override', () => ({ saveTab: vi.fn(async () => {}) }));
vi.mock('@/shared/monaco', () => {
  /** A model that can be typed in: each edit bumps its version and tells its listeners, as Monaco's does. */
  class FakeModel {
    uri = { toString: () => `inmemory://tab/${Math.random()}` };
    private version = 1;
    private listeners: Array<() => void> = [];
    constructor(private text: string) {}
    getValue = () => this.text;
    setValue = (text: string) => {
      this.text = text;
      this.version++;
      for (const l of this.listeners) l();
    };
    getAlternativeVersionId = () => this.version;
    onDidChangeContent = (listener: () => void) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    dispose = () => {};
  }
  return {
    monaco: { editor: { createModel: (text: string) => new FakeModel(text) }, Uri: { from: () => ({}) } },
    languageFor: () => 'json',
    setModelSchema: vi.fn(),
    editorHasFocus: () => false,
    dismissEditorWidgets: () => {},
    triggerInActiveEditor: () => {},
    isReadOnlyModel: () => false,
    keybindingOf: () => 0,
  };
});

type ToastCall = { title: string; description?: string; tone?: string };
const toasts = () => (toast.mock.calls as unknown as Array<[ToastCall]>).map(([t]) => t);
const flush = () => new Promise((r) => setTimeout(r, 0));

const API = 'https://api.test/v1/orders';

function held(extra: Partial<HeldRequest> = {}): HeldRequest {
  return {
    id: 'held-1',
    breakpointId: 'bp-1',
    stage: 'response',
    url: API,
    method: 'GET',
    requestHeaders: [{ name: 'Accept', value: 'application/json' }],
    response: { status: 200, statusText: 'OK', headers: [{ name: 'Content-Type', value: 'application/json' }], body: '{"items":[1]}' },
    heldAt: 0,
    ...extra,
  };
}

const heldRequest = (extra: Partial<HeldRequest> = {}) => held({ stage: 'request', method: 'POST', requestBody: '{"sku":"A1"}', response: undefined, ...extra });

async function opened(h: HeldRequest) {
  receiveHeld([...useHeldStore.getState().held, h]);
  await flush();
  const tab = useTabStore.getState().tabs.find((t) => t.held === h.id)!;
  return { tab, model: getTabModel(tab.id) as unknown as { setValue(text: string): void } };
}

const workspace = (breakpoints: Breakpoint[] = []): Workspace => ({ id: 'w1', name: '', host: '', title: '', icon: 'favicon', color: 'ember', frameNames: {}, breakpoints });

beforeEach(() => {
  vi.clearAllMocks();
  useTabStore.setState({ tabs: [], pages: [], activeId: null, diff: 'off' });
  useHeldStore.setState({ held: [] });
  useHeldDrafts.setState({ drafts: {} });
  useOverrideStore.setState({ byId: {} });
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, autoFormatMinified: false } });
  useWorkspaceStore.setState({ workspaces: [workspace()], activeId: 'w1' });
});

describe('a held request', () => {
  it('opens in front with its body to edit, and closes once let go, without a word', async () => {
    const { tab } = await opened(held());
    expect(tab).toMatchObject({ url: API, kind: 'Fetch', held: 'held-1', dirty: false });
    expect(useTabStore.getState().activeId).toBe(tab.id);
    expect(getTabModel(tab.id)!.getValue()).toBe('{"items":[1]}');
    expect(useHeldDrafts.getState().drafts['held-1']).toEqual({ url: API, method: 'GET', status: '200', headers: [], rowKeys: [] });

    // Sent (Send original): the main process lists it no more.
    api.resumeHeldRequest.mockImplementationOnce(async () => receiveHeld([]));
    await sendOriginal('held-1');
    expect(api.resumeHeldRequest).toHaveBeenCalledExactlyOnceWith('held-1', { type: 'continue' });
    expect(useTabStore.getState().tabs).toEqual([]);
    expect(useHeldDrafts.getState().drafts).toEqual({});
    expect(toasts()).toEqual([]);
  });

  it('says so when the page gave up on it', async () => {
    await opened(held());
    receiveHeld([]);
    expect(useTabStore.getState().tabs).toEqual([]);
    expect(toasts()).toEqual([expect.objectContaining({ title: 'The page gave up on GET orders', tone: 'warning' })]);
  });

  it('at its response, answers with the status and header changes, and the body as it came until it is edited', async () => {
    const { tab } = await opened(held());
    useHeldDrafts.getState().patch('held-1', { status: '503', headers: [{ operation: 'set', name: 'Retry-After', value: '5' }, { operation: 'set', name: ' ', value: '' }] });
    await sendHeld(tab.id);
    expect(api.resumeHeldRequest).toHaveBeenLastCalledWith('held-1', { type: 'respond', status: 503, headers: [{ operation: 'set', name: 'Retry-After', value: '5' }], body: '{"items":[1]}' });
    expect(useTabStore.getState().tabs).toEqual([]);

    // Edited, and sent with Save (Ctrl/Cmd+S), which never saves a held tab as an override.
    const { model } = await opened(held({ id: 'held-2' }));
    model.setValue('{"items":[]}');
    expect(useTabStore.getState().tabs[0]!.dirty).toBe(true);
    saveFileTab();
    await flush();
    expect(api.resumeHeldRequest).toHaveBeenLastCalledWith('held-2', expect.objectContaining({ type: 'respond', body: '{"items":[]}' }));
    expect(saveTab).not.toHaveBeenCalled();
  });

  it('before it is sent, goes out with the edited method, URL and headers, and its own body until that is edited', async () => {
    const { tab } = await opened(heldRequest());
    expect(getTabModel(tab.id)!.getValue()).toBe('{"sku":"A1"}');
    useHeldDrafts.getState().patch('held-1', { method: 'put ', url: `${API}/7`, headers: [{ operation: 'remove', name: 'Accept', value: '' }] });
    await sendHeld(tab.id);
    expect(api.resumeHeldRequest).toHaveBeenLastCalledWith('held-1', { type: 'send', url: `${API}/7`, method: 'PUT', headers: [{ operation: 'remove', name: 'Accept', value: '' }] });

    const { tab: edited, model } = await opened(heldRequest({ id: 'held-2' }));
    model.setValue('{"sku":"B2"}');
    await sendHeld(edited.id);
    expect(api.resumeHeldRequest).toHaveBeenLastCalledWith('held-2', { type: 'send', url: API, method: 'POST', headers: [], body: '{"sku":"B2"}' });
  });

  it('is not sent with a field that could not go out, and says why', async () => {
    const { tab } = await opened(held());
    useHeldDrafts.getState().patch('held-1', { status: '42' });
    await sendHeld(tab.id);
    useHeldDrafts.getState().drop('held-1');
    const { tab: request } = await opened(heldRequest({ id: 'held-2' }));
    useHeldDrafts.getState().patch('held-2', { url: 'file:///etc/passwd' });
    await sendHeld(request.id);

    expect(api.resumeHeldRequest).not.toHaveBeenCalled();
    expect(toasts().map((t) => t.description)).toEqual([expect.stringMatching(/status is a number/), expect.stringMatching(/web address/)]);
  });

  it('fails with the network error picked', async () => {
    await opened(held());
    await failHeldRequest('held-1', 'ConnectionRefused');
    expect(api.resumeHeldRequest).toHaveBeenCalledExactlyOnceWith('held-1', { type: 'fail', reason: 'ConnectionRefused' });
    expect(useTabStore.getState().tabs).toEqual([]);
  });

  it('keeps its tab when it could not be let go, and says why', async () => {
    await opened(held());
    api.resumeHeldRequest.mockRejectedValueOnce(new Error('That request is no longer held'));
    await sendOriginal('held-1');
    expect(useTabStore.getState().tabs).toHaveLength(1);
    expect(toasts()).toEqual([expect.objectContaining({ description: 'That request is no longer held', tone: 'danger' })]);
  });

  it('is saved as an override answering it from now on; the tab stays as the override’s', async () => {
    const { tab, model } = await opened(held({ method: 'POST', requestBody: '{"operationName":"GetOrders"}' }));
    model.setValue('{"items":[]}');
    useHeldDrafts.getState().patch('held-1', { status: '201' });
    api.createOverride.mockResolvedValueOnce({ id: 'o1', kind: 'Fetch', sourceUrl: API, match: { type: 'exact', pattern: API, ignoreQuery: true }, enabled: true, originalHash: null, createdAt: 0, updatedAt: 0 });
    await saveHeldAsOverride(tab.id);

    expect(api.createOverride).toHaveBeenCalledExactlyOnceWith({
      kind: 'Fetch',
      sourceUrl: API,
      content: '{"items":[]}',
      base: '{"items":[1]}',
      originalHash: null,
      request: { method: 'POST', operation: 'GetOrders' },
      response: { status: 201, delayMs: 0, headers: [], send: false, patch: false },
    });
    expect(api.resumeHeldRequest).toHaveBeenCalledExactlyOnceWith('held-1', { type: 'respond', status: 201, headers: [], body: '{"items":[]}' });
    expect(useTabStore.getState().tabs).toEqual([expect.objectContaining({ id: tab.id, overrideId: 'o1', held: undefined, dirty: false })]);
    expect(useOverrideStore.getState().byId.o1).toBeDefined();
  });

  it('closing its tab lets it go as it was, asking first when its body was edited', async () => {
    const { tab, model } = await opened(held());
    model.setValue('{}');
    confirm.mockResolvedValueOnce(false);
    await closeTab(tab.id);
    expect(api.resumeHeldRequest).not.toHaveBeenCalled();
    expect(useTabStore.getState().tabs).toHaveLength(1);

    await closeTab(tab.id);
    expect(api.resumeHeldRequest).toHaveBeenCalledExactlyOnceWith('held-1', { type: 'continue' });
    expect(useTabStore.getState().tabs).toEqual([]);
    receiveHeld([]);
    expect(toasts()).toEqual([]);
  });

  it('is never kept in the session', async () => {
    await opened(held());
    useTabStore.getState().add({ id: 'file', url: 'https://site.test/a.js', kind: 'Script', originalHash: null, lite: false, dirty: false, saving: false });
    expect(keptTabs(useTabStore.getState().tabs).map((t) => t.id)).toEqual(['file']);
  });
});

describe('breakpoints', () => {
  it('are added on, toggled and removed in the shown workspace, and saved', async () => {
    expect(addBreakpoint({ match: { type: 'glob', pattern: 'https://api.test/*', ignoreQuery: true }, method: '*', stage: 'request' })).toBe(true);
    await flush();
    const [added] = useWorkspaceStore.getState().workspaces[0]!.breakpoints;
    expect(added).toMatchObject({ id: expect.stringMatching(/^bp-/), method: '*', stage: 'request', enabled: true });
    expect(api.updateWorkspace).toHaveBeenLastCalledWith('w1', { breakpoints: [added] });

    await toggleBreakpoint(added!.id);
    expect(useWorkspaceStore.getState().workspaces[0]!.breakpoints[0]!.enabled).toBe(false);
    await removeBreakpoint(added!.id);
    expect(api.updateWorkspace).toHaveBeenLastCalledWith('w1', { breakpoints: [] });
  });

  it('are not added with a pattern that matches nothing, and say why', () => {
    expect(addBreakpoint({ match: { type: 'regex', pattern: '(', ignoreQuery: true }, method: 'GET', stage: 'response' })).toBe(false);
    expect(api.updateWorkspace).not.toHaveBeenCalled();
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Could not add the breakpoint', tone: 'warning' })]);
  });

  it('Pause like this stops the same URL (any query) and method at the response, once', async () => {
    pauseLike({ url: `${API}?page=2`, method: 'GET' });
    pauseLike({ url: `${API}?page=3`, method: 'GET' });
    await flush();
    expect(useWorkspaceStore.getState().workspaces[0]!.breakpoints).toEqual([
      { id: expect.any(String), match: { type: 'exact', pattern: API, ignoreQuery: true }, method: 'GET', stage: 'response', enabled: true },
    ]);
  });

  it('are put back as saved when saving them fails', async () => {
    api.updateWorkspace.mockRejectedValueOnce(new Error('disk full'));
    api.getWorkspaces.mockResolvedValueOnce({ activeId: 'w1', workspaces: [workspace()] });
    addBreakpoint({ match: { type: 'glob', pattern: '*', ignoreQuery: true }, method: '*', stage: 'response' });
    await vi.waitFor(() => expect(api.getWorkspaces).toHaveBeenCalled());
    await flush();
    expect(useWorkspaceStore.getState().workspaces[0]!.breakpoints).toEqual([]);
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Could not change the breakpoints', description: 'disk full' })]);
  });
});

describe('Copy as fetch', () => {
  it('gives the URL, method, the headers a page may set, the referrer and body, with the page’s cookies', () => {
    const snippet = fetchSnippet(
      { url: `${API}?page=2`, method: 'POST' },
      {
        requestHeaders: [
          { name: ':authority', value: 'api.test' },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Authorization', value: 'Bearer t' },
          { name: 'Cookie', value: 'sid=1' },
          { name: 'Referer', value: 'https://shop.test/cart' },
          { name: 'Sec-Fetch-Mode', value: 'cors' },
          { name: 'User-Agent', value: 'x' },
        ],
        body: '{"sku":"A1"}',
      },
    );
    expect(snippet.startsWith(`fetch("${API}?page=2", `)).toBe(true);
    expect(JSON.parse(snippet.slice(snippet.indexOf(', ') + 2, -2))).toEqual({
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t' },
      referrer: 'https://shop.test/cart',
      body: '{"sku":"A1"}',
      mode: 'cors',
      credentials: 'include',
    });
  });

  it('leaves out a body the request had none of', () => {
    expect(fetchSnippet({ url: API, method: 'GET' }, { requestHeaders: [] })).not.toContain('"body"');
  });
});
