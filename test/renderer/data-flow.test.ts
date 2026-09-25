import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverrideMeta, ResourceEntry, WorkerType } from '../../src/shared/types';
import { handleAppEvent } from '@/app/model/bridge';
import { HIDDEN_FLUSH_MS } from '@/app/model/bridge/resources/constants';
import { createTabModel, getTabModel, newTabId, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useResourceStore } from '@/entities/resource';
import { closeDiff, compareWithLive, showBaseDiff, useDiffSource } from '@/features/compare-changes';
import { deleteOverride } from '@/features/delete-override';
import { formatTab } from '@/features/format-document';
import { saveTab } from '@/features/save-override';

/** Just enough of a Monaco text model: text, an alternative version id, change listeners. */
const { FakeModel } = vi.hoisted(() => {
  class FakeModel {
    disposed = false;
    private version = 1;
    private listeners = new Set<() => void>();
    constructor(private text: string) {}
    getValue() {
      return this.text;
    }
    getValueLength() {
      return this.text.length;
    }
    getAlternativeVersionId() {
      return this.version;
    }
    /** Stands in for the user typing. */
    type(text: string) {
      this.text = text;
      this.version++;
      this.listeners.forEach((l) => l());
    }
    onDidChangeContent(listener: () => void) {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    }
    pushStackElement() {}
    pushEditOperations(_: unknown, ops: { text: string }[]) {
      this.type(ops[0].text);
      return null;
    }
    getFullModelRange() {
      return {};
    }
    dispose() {
      this.disposed = true;
    }
  }
  return { FakeModel };
});

const api = vi.hoisted(() => ({
  deleteOverride: vi.fn(),
  getResourceContent: vi.fn(),
  getOverrideBase: vi.fn(),
  createOverride: vi.fn(),
  updateOverride: vi.fn(),
  reload: vi.fn(async () => {}),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(() => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));
const formatCode = vi.hoisted(() => vi.fn<(text: string) => Promise<string>>());

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm: async () => true }));
vi.mock('@/shared/lib', async (importOriginal) => ({ ...(await importOriginal<object>()), formatCode }));
vi.mock('@/shared/monaco', () => ({
  monaco: { editor: { createModel: (text: string) => new FakeModel(text) }, Uri: { from: () => ({}) } },
  languageFor: () => 'javascript',
  setModelSchema: () => {},
  editorHasFocus: () => false,
  dismissEditorWidgets: () => {},
  triggerInActiveEditor: () => {},
}));

type Model = InstanceType<typeof FakeModel>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** Lets pending promise callbacks and 0 ms timers run. */
const tick = () => new Promise((r) => setTimeout(r, 0));

function openTab(overrideId?: string, text = 'let a = 1;'): { id: string; model: Model } {
  const id = newTabId();
  const url = `https://site.test/${id}.js`;
  createTabModel(id, url, 'Script', text, overrideId ? undefined : text);
  useTabStore.getState().add({ id, url, kind: 'Script', overrideId, originalHash: null, lite: false, dirty: false, saving: false });
  return { id, model: getTabModel(id) as unknown as Model };
}

const meta = (id: string, sourceUrl = 'https://site.test/main.js'): OverrideMeta => ({
  id,
  kind: 'Script',
  sourceUrl,
  match: { type: 'exact', pattern: sourceUrl, ignoreQuery: false },
  enabled: true,
  originalHash: null,
  createdAt: 0,
  updatedAt: 0,
});

beforeEach(() => {
  vi.clearAllMocks();
  useTabStore.setState({ tabs: [], activeId: null, diff: 'off' });
  useOverrideStore.setState({ byId: {}, hits: {}, upstreamChanged: {} });
});

describe('delete override', () => {
  it("closes and disposes the override's tabs although overrides-changed arrives before the reply", async () => {
    useOverrideStore.getState().setAll([meta('o1')]);
    const { model } = openTab('o1');
    const other = openTab();
    api.deleteOverride.mockImplementation(async () => {
      // Main sends the event before the invoke reply.
      handleAppEvent({ type: 'overrides-changed', overrides: [] });
    });

    await deleteOverride('o1');

    expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([other.id]);
    await tick();
    expect(model.disposed).toBe(true);
    expect(other.model.disposed).toBe(false);
  });
});

describe('compare changes', () => {
  const live = (content: string) => ({ url: '', content, hash: 'h' });

  it('shows the live file for the tab that asked for it', async () => {
    const a = openTab('o1');
    api.getResourceContent.mockResolvedValue(live('live text'));
    await compareWithLive(a.id);
    expect(useTabStore.getState().diff).toBe('live');
    expect(useDiffSource.getState().original?.getValue()).toBe('live text');
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1');
  });

  it('drops a live file that arrives after switching tabs', async () => {
    const a = openTab('o1');
    const b = openTab();
    useTabStore.getState().activate(a.id);
    const fetch = deferred<ReturnType<typeof live>>();
    api.getResourceContent.mockReturnValue(fetch.promise);

    const pending = compareWithLive(a.id);
    useTabStore.getState().activate(b.id);
    fetch.resolve(live('live text'));
    await pending;

    expect(useTabStore.getState()).toMatchObject({ activeId: b.id, diff: 'off' });
    expect(useDiffSource.getState().original).toBeNull();
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1');
  });

  it('drops it when the tab was closed meanwhile (no diff mode without a diff)', async () => {
    const a = openTab('o1');
    openTab();
    useTabStore.getState().activate(a.id);
    const fetch = deferred<ReturnType<typeof live>>();
    api.getResourceContent.mockReturnValue(fetch.promise);

    const pending = compareWithLive(a.id);
    useTabStore.getState().remove(a.id);
    fetch.resolve(live('live text'));
    await pending;

    expect(useTabStore.getState().diff).toBe('off');
    expect(useDiffSource.getState().original).toBeNull();
  });

  it('does not reopen a diff that was closed while the live file loaded', async () => {
    const a = openTab('o1');
    api.getOverrideBase.mockResolvedValue('base text');
    await showBaseDiff(a.id);
    expect(useTabStore.getState().diff).toBe('base');
    const fetch = deferred<ReturnType<typeof live>>();
    api.getResourceContent.mockReturnValue(fetch.promise);

    const pending = compareWithLive(a.id);
    closeDiff();
    fetch.resolve(live('live text'));
    await pending;

    expect(useTabStore.getState().diff).toBe('off');
    expect(useDiffSource.getState().original).toBeNull();
  });

  it('drops a base that arrives after switching tabs', async () => {
    const a = openTab('o1');
    const b = openTab();
    useTabStore.getState().activate(a.id);
    const base = deferred<string>();
    api.getOverrideBase.mockReturnValue(base.promise);

    const pending = showBaseDiff(a.id);
    useTabStore.getState().activate(b.id);
    base.resolve('base text');
    await pending;

    expect(useTabStore.getState().diff).toBe('off');
    expect(useDiffSource.getState().original).toBeNull();
  });

  it('keeps the old left model alive until the diff editor has switched to the new one (base -> live)', async () => {
    const a = openTab();
    await showBaseDiff(a.id);
    const baseModel = useDiffSource.getState().original as unknown as Model;
    expect(baseModel.getValue()).toBe('let a = 1;');

    api.getResourceContent.mockResolvedValue(live('live text'));
    await compareWithLive(a.id);

    expect(useTabStore.getState().diff).toBe('live');
    expect(useDiffSource.getState().original).not.toBe(baseModel);
    expect(baseModel.disposed).toBe(false);
    await tick();
    expect(baseModel.disposed).toBe(true);
  });
});

describe('save override', () => {
  it('saves text typed during a running save once it finishes, and reports done only then', async () => {
    const { id, model } = openTab(undefined, 'v1');
    const create = deferred<OverrideMeta>();
    api.createOverride.mockReturnValue(create.promise);
    api.updateOverride.mockResolvedValue(meta('o9'));

    const first = saveTab(id);
    model.type('v2');
    const second = saveTab(id);
    expect(saveTab(id)).toBe(second);
    expect(api.createOverride).toHaveBeenCalledTimes(1);
    expect(api.createOverride.mock.calls[0][0]).toMatchObject({ content: 'v1' });

    let secondDone = false;
    void second.then(() => (secondDone = true));
    create.resolve(meta('o9'));
    await first;
    expect(secondDone).toBe(false);
    await second;

    expect(api.updateOverride).toHaveBeenCalledTimes(1);
    expect(api.updateOverride).toHaveBeenCalledWith('o9', { content: 'v2' });
    expect(useTabStore.getState().tabs[0]).toMatchObject({ overrideId: 'o9', dirty: false, saving: false });
  });

  it('does not save again when nothing changed during the running save', async () => {
    const { id } = openTab(undefined, 'v1');
    const create = deferred<OverrideMeta>();
    api.createOverride.mockReturnValue(create.promise);

    saveTab(id);
    const again = saveTab(id);
    create.resolve(meta('o9'));
    await again;

    expect(api.createOverride).toHaveBeenCalledTimes(1);
    expect(api.updateOverride).not.toHaveBeenCalled();
  });
});

describe('format document', () => {
  it('leaves edits typed while the worker formats alone', async () => {
    const { id, model } = openTab(undefined, 'a=1');
    const formatted = deferred<string>();
    formatCode.mockReturnValue(formatted.promise);

    const pending = formatTab(id);
    model.type('a=12');
    formatted.resolve('a = 1;\n');
    await pending;

    expect(model.getValue()).toBe('a=12');
    expect(toast.update).toHaveBeenCalledWith('toast-1', expect.objectContaining({ tone: 'warning' }));
  });

  it('applies the formatted text when the file did not change', async () => {
    const { id, model } = openTab(undefined, 'a=1');
    formatCode.mockResolvedValue('a = 1;\n');
    await formatTab(id);
    expect(model.getValue()).toBe('a = 1;\n');
  });
});

describe('bridge: resource events', () => {
  const frames: FrameRequestCallback[] = [];
  const res = (url: string, iframeId?: string): ResourceEntry => ({ url, kind: 'Script', mimeType: 'text/javascript', status: 200, iframeId });
  const inWorker = (type: WorkerType, workerUrl: string, workerId: string, url = workerUrl): ResourceEntry => ({
    ...res(url),
    worker: { type, url: workerUrl },
    workerId,
  });
  const urls = () => Object.values(useResourceStore.getState().byKey).map((e) => e.url);

  beforeEach(() => {
    frames.length = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    // Not `reset()`: that keeps service and shared workers' files.
    useResourceStore.setState({ byKey: {} });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('applies a frame worth of events as one store update, in order', () => {
    const updates = vi.fn();
    const off = useResourceStore.subscribe(updates);
    handleAppEvent({ type: 'resource', resource: res('https://old.test/a.js') });
    handleAppEvent({ type: 'navigated', url: 'https://site.test/' });
    handleAppEvent({ type: 'resource', resource: res('https://site.test/b.js') });
    handleAppEvent({ type: 'resource', resource: res('https://w.test/w1.js', 'S1') });
    handleAppEvent({ type: 'navigated', url: 'https://w.test/next', iframeId: 'S1' });
    handleAppEvent({ type: 'resource', resource: res('https://w.test/w2.js', 'S1') });
    handleAppEvent({ type: 'resource', resource: res('https://x.test/x.js', 'S2') });
    handleAppEvent({ type: 'iframe-detached', iframeId: 'S2' });
    handleAppEvent({ type: 'resource', resource: res('https://site.test/c.js') });

    expect(urls()).toEqual([]);
    expect(frames).toHaveLength(1);
    frames[0](0);
    off();

    expect(updates).toHaveBeenCalledTimes(1);
    expect(urls().sort()).toEqual(['https://site.test/b.js', 'https://site.test/c.js', 'https://w.test/w2.js']);
  });

  it("drops a worker's files when it goes away, and only its files", () => {
    handleAppEvent({ type: 'resource', resource: res('https://site.test/lib.js') });
    handleAppEvent({ type: 'resource', resource: inWorker('worker', 'https://site.test/a.js', 'W1') });
    handleAppEvent({ type: 'resource', resource: inWorker('worker', 'https://site.test/a.js', 'W1', 'https://site.test/lib.js') });
    handleAppEvent({ type: 'resource', resource: inWorker('worker', 'https://site.test/b.js', 'W2') });
    handleAppEvent({ type: 'worker-detached', workerId: 'W1' });
    frames[0](0);
    expect(urls()).toEqual(['https://site.test/lib.js', 'https://site.test/b.js']);
  });

  it("keeps a service worker's files queued before a navigation, and its going away queued before one", () => {
    handleAppEvent({ type: 'resource', resource: inWorker('service_worker', 'https://site.test/sw.js', 'W1') });
    handleAppEvent({ type: 'resource', resource: inWorker('worker', 'https://site.test/w.js', 'W2') });
    handleAppEvent({ type: 'resource', resource: res('https://site.test/old.js') });
    handleAppEvent({ type: 'navigated', url: 'https://site.test/next' });
    handleAppEvent({ type: 'resource', resource: inWorker('service_worker', 'https://site.test/sw.js', 'W1', 'https://site.test/sw-lib.js') });
    handleAppEvent({ type: 'resource', resource: res('https://site.test/new.js') });
    frames[0](0);
    expect(urls()).toEqual(['https://site.test/sw.js', 'https://site.test/sw-lib.js', 'https://site.test/new.js']);

    // A new version took over, then the page navigated, in one frame.
    handleAppEvent({ type: 'worker-detached', workerId: 'W1' });
    handleAppEvent({ type: 'resource', resource: inWorker('service_worker', 'https://site.test/sw.js', 'W3') });
    handleAppEvent({ type: 'navigated', url: 'https://site.test/' });
    frames[1](0);
    expect(Object.values(useResourceStore.getState().byKey).map((e) => `${e.workerId} ${e.url}`)).toEqual(['W3 https://site.test/sw.js']);
  });

  it('keeps applying events while frames are paused (hidden window)', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    handleAppEvent({ type: 'resource', resource: res('https://site.test/a.js') });
    handleAppEvent({ type: 'resource', resource: res('https://site.test/b.js') });
    expect(urls()).toEqual([]);

    vi.advanceTimersByTime(HIDDEN_FLUSH_MS);
    expect(urls()).toEqual(['https://site.test/a.js', 'https://site.test/b.js']);

    // The next event schedules a new flush.
    handleAppEvent({ type: 'resource', resource: res('https://site.test/c.js') });
    expect(frames).toHaveLength(2);
    frames[1](0);
    expect(urls()).toHaveLength(3);
    // A frame flush cancels the fallback timer: nothing is left to run.
    expect(vi.getTimerCount()).toBe(0);
  });
});
